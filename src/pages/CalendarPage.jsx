import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/calendar/calendar.api";

function ymd(d){ return new Date(d).toISOString().slice(0,10); }
function firstOfMonth(d){ const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfGrid(monthDate){
  const first = firstOfMonth(monthDate);
  const dow = first.getDay(); // 0=Sun
  return addDays(first, -dow); // Sunday grid start
}
function endOfGrid(monthDate){
  const start = startOfGrid(monthDate);
  return addDays(start, 6*7 - 1); // 6 weeks grid
}
function sameDay(a,b){ return ymd(a) === ymd(b); }

export default function CalendarPage(){
  const { token } = useAuth();
  const [monthDate, setMonthDate] = useState(firstOfMonth(new Date()));
  const [selected, setSelected] = useState(ymd(new Date()));

  // events
  const [events, setEvents] = useState([]); // flat list
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // AI plan
  const [plan, setPlan] = useState({ loading: true, item: null, nothingToDo: false, err: "" });

  const gridStart = useMemo(()=> startOfGrid(monthDate), [monthDate]);
  const gridEnd   = useMemo(()=> endOfGrid(monthDate),   [monthDate]);

  const days = useMemo(()=>{
    const arr = [];
    for (let i=0;i<42;i++) arr.push(addDays(gridStart, i));
    return arr;
  }, [gridStart]);

  // map date -> events
  const byDate = useMemo(()=>{
    const m = new Map();
    for (const e of events){ if(!m.has(e.date)) m.set(e.date, []); m.get(e.date).push(e); }
    // sort by allDay then startTime
    for (const v of m.values()){
      v.sort((a,b)=>{
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return (a.startTime || "99:99").localeCompare(b.startTime || "99:99");
      });
    }
    return m;
  }, [events]);

  async function loadEvents(){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const { items } = await api.listRange(token, { start: ymd(gridStart), end: ymd(gridEnd) });
      setEvents(items || []);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  async function loadPlan(dateStr){
    if(!token) return;
    setPlan(s => ({ ...s, loading:true, err:"" }));
    try{
      const { item } = await api.getDaily(token, dateStr);
      setPlan({ loading:false, item, nothingToDo: !item || (item.agenda||[]).length===0, err:"" });
    }catch(e){ setPlan({ loading:false, item:null, nothingToDo:true, err:e.message }); }
  }

  useEffect(()=>{ if(token){ loadEvents(); } /* eslint-disable-next-line */ }, [token, gridStart.toISOString(), gridEnd.toISOString()]);
  useEffect(()=>{ if(token){ loadPlan(selected); } }, [token, selected]);

  // modal state
  const [modal, setModal] = useState({ open:false, data:null });

  function prevMonth(){ const d = new Date(monthDate); d.setMonth(d.getMonth()-1); setMonthDate(firstOfMonth(d)); }
  function nextMonth(){ const d = new Date(monthDate); d.setMonth(d.getMonth()+1); setMonthDate(firstOfMonth(d)); }
  function today(){ const t = firstOfMonth(new Date()); setMonthDate(t); setSelected(ymd(new Date())); }

  async function onSave(ev){
    if(!token) return;
    if (ev.id){
      await api.update(token, ev.id, ev);
    } else {
      await api.create(token, ev);
    }
    setModal({ open:false, data:null });
    await loadEvents();
    await loadPlan(ev.date);
  }

  async function onDelete(id, dateStr){
    if(!token) return;
    await api.remove(token, id);
    setModal({ open:false, data:null });
    await loadEvents();
    await loadPlan(dateStr);
  }

  async function onGeneratePlan(){
    setPlan({ loading:true, item:null, nothingToDo:false, err:"" });
    try{
      const res = await api.generateDaily(token, selected);
      setPlan({ loading:false, item: res.item, nothingToDo: res.nothingToDo || (res.item?.agenda?.length===0), err:"" });
    }catch(e){ setPlan({ loading:false, item:null, nothingToDo:true, err:e.message }); }
  }

  return (
    <div className="fade-in" style={{ display:"grid", gap:16 }}>
      {/* Toolbar */}
      <div className="panel" style={{ padding:12, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <div className="kicker">Calendar</div>
        <div className="ui-mono" style={{ fontWeight:600 }}>
          {monthDate.toLocaleString(undefined, { month:"long", year:"numeric" })}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button className="btn" onClick={prevMonth}>‹ Prev</button>
          <button className="btn" onClick={today}>Today</button>
          <button className="btn" onClick={nextMonth}>Next ›</button>
        </div>
        <div style={{ flex:1 }} />
        <button className="btn" onClick={()=> setModal({ open:true, data:{ date: selected, title:"", allDay:true }})}>New event</button>
      </div>

      {/* AI Day Plan */}
      <section className="ai-card" style={{ padding:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:8 }}>
          <span className="ai-chip">✨ Day Plan</span>
          <span className="kicker">{selected}</span>
          <div style={{ flex:1 }} />
          <button className="btn" onClick={onGeneratePlan} disabled={plan.loading}>
            {plan.loading ? "Planning…" : "Generate plan"}
          </button>
        </div>
        {plan.err && <p className="prose" style={{ color:"crimson" }}>{plan.err}</p>}
        {!plan.loading && plan.nothingToDo && (
          <p className="prose" style={{ margin:0, color:"var(--muted)" }}>✨ Nothing scheduled today.</p>
        )}
        {!plan.loading && !plan.nothingToDo && plan.item?.agenda?.length > 0 && (
          <ul className="prose" style={{ margin:0, paddingLeft:"1.2em" }}>
            {plan.item.agenda.map((b,i)=><li key={i}>{b}</li>)}
          </ul>
        )}
      </section>

      {/* Month grid */}
      <div className="card" style={{ padding:12 }}>
        {err && <p className="prose" style={{ color:"crimson" }}>{err}</p>}
        {loading ? <p className="prose">Loading…</p> : (
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(7, 1fr)",
            gap:8
          }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
              <div key={i} className="ui-mono" style={{ fontSize:12, color:"var(--muted)", padding:"6px 8px" }}>{d}</div>
            ))}
            {days.map((d,i)=>{
              const isOtherMonth = d.getMonth() !== monthDate.getMonth();
              const key = ymd(d);
              const list = byDate.get(key) || [];
              const isSelected = key === selected;
              return (
                <div
                  key={i}
                  onClick={()=> setSelected(key)}
                  onDoubleClick={()=> setModal({ open:true, data:{ date: key, title:"", allDay:true } })}
                  className="panel"
                  style={{
                    padding:8, minHeight:96, cursor:"pointer",
                    outline: isSelected ? `2px solid var(--accent)` : "none",
                    opacity: isOtherMonth ? .6 : 1
                  }}
                  title="Double-click to create event"
                >
                  <div style={{ display:"flex", alignItems:"center" }}>
                    <div className="ui-mono" style={{ fontSize:12, color:"var(--muted)" }}>
                      {d.getDate()}
                    </div>
                    <div style={{ flex:1 }} />
                    <span className="chip">{list.length} evt</span>
                  </div>

                  <div style={{ display:"grid", gap:6, marginTop:6 }}>
                    {list.slice(0,3).map(ev=>(
                      <button
                        key={ev.id}
                        className="btn"
                        onClick={(e)=>{ e.stopPropagation(); setModal({ open:true, data: ev }); }}
                        title="Click to edit"
                        style={{
                          justifyContent:"flex-start",
                          overflow:"hidden",
                          textOverflow:"ellipsis",
                          whiteSpace:"nowrap"
                        }}
                      >
                        {ev.allDay ? "All-day" : ev.startTime} · {ev.title}
                      </button>
                    ))}
                    {list.length > 3 && <div className="kicker">+{list.length-3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal.open && (
        <EventModal
          data={modal.data}
          onClose={()=> setModal({ open:false, data:null })}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

/* ---- Inline Event Modal (simple, cozy) ---- */
function EventModal({ data, onClose, onSave, onDelete }){
  const [f,setF] = useState({
    id: data?.id || null,
    title: data?.title || "",
    date: data?.date || ymd(new Date()),
    allDay: data?.allDay ?? true,
    startTime: data?.startTime || "",
    endTime: data?.endTime || "",
    location: data?.location || "",
    description: data?.description || "",
    color: data?.color || "",
  });
  const [saving,setSaving]=useState(false);

  function update(k,v){ setF(s=>({ ...s, [k]: v })); }

  async function handleSave(){
    if (!f.title) return;
    setSaving(true);
    try{ await onSave(f); } finally { setSaving(false); }
  }

  async function handleDelete(){
    if (!f.id) return onClose();
    if (!confirm("Delete this event?")) return;
    setSaving(true);
    try{ await onDelete(f.id, f.date); } finally { setSaving(false); }
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"color-mix(in oklab, black 30%, transparent)",
      display:"grid", placeItems:"center", zIndex:1000, padding:"16px"
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth:560, width:"100%", padding:16 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <div className="kicker">{f.id ? "Edit event" : "New event"}</div>
          <div style={{ flex:1 }} />
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div style={{ display:"grid", gap:10 }}>
          <div>
            <label>Title</label>
            <input value={f.title} onChange={e=>update("title", e.target.value)} placeholder="Event title" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label>Date</label>
              <input type="date" value={f.date} onChange={e=>update("date", e.target.value)} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:18 }}>
              <label className="ui-mono" style={{ fontSize:12 }}>
                <input type="checkbox" checked={f.allDay} onChange={e=>update("allDay", e.target.checked)} />
                &nbsp;All-day
              </label>
            </div>
          </div>

          {!f.allDay && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label>Start</label>
                <input type="time" value={f.startTime} onChange={e=>update("startTime", e.target.value)} />
              </div>
              <div>
                <label>End</label>
                <input type="time" value={f.endTime} onChange={e=>update("endTime", e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label>Location</label>
            <input value={f.location} onChange={e=>update("location", e.target.value)} placeholder="Optional" />
          </div>

          <div>
            <label>Details</label>
            <textarea
              className="editor-body"
              rows={4}
              value={f.description}
              onChange={e=>update("description", e.target.value)}
              placeholder="Notes, context, links…"
            />
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          {f.id && <button className="btn" onClick={handleDelete} disabled={saving}>Delete</button>}
        </div>
      </div>
    </div>
  );
}
