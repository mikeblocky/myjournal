import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/calendar/calendar.api";
import LoadingSpinner from "../components/LoadingSpinner";
import { ymd, firstOfMonthDate, addDays } from "../lib/date";
import "../styles/calendar.css";

function startOfGrid(monthDate){
  // Ensure monthDate is a valid Date object
  if (!(monthDate instanceof Date) || isNaN(monthDate.getTime())) {
    console.error('Invalid monthDate in startOfGrid:', monthDate);
    return new Date(); // Return today as fallback
  }
  
  const first = firstOfMonthDate(monthDate);
  const dow = first.getDay(); // 0=Sun
  // Use our date utility to avoid timezone issues
  const startDate = new Date(first);
  startDate.setDate(startDate.getDate() - dow);
  return startDate;
}
function endOfGrid(monthDate){
  const start = startOfGrid(monthDate);
  // Ensure start is a valid Date object
  if (!(start instanceof Date) || isNaN(start.getTime())) {
    console.error('Invalid start date in endOfGrid:', start);
    return new Date(); // Return today as fallback
  }
  
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 6*7 - 1); // 6 weeks grid
  return endDate;
}
function sameDay(a,b){ return ymd(a) === ymd(b); }

export default function CalendarPage(){
  const { token } = useAuth();
  
  // Ensure monthDate is properly initialized as a Date object
  const [monthDate, setMonthDate] = useState(() => {
    const today = new Date();
    const firstOfMonth = firstOfMonthDate(today);
    console.log('Initializing monthDate:', { today, firstOfMonth });
    return firstOfMonth;
  });
  
  const [selected, setSelected] = useState(ymd(new Date()));
  const [viewMode, setViewMode] = useState("month"); // "month", "week", or "list"
  const [isMobile, setIsMobile] = useState(false);

  // events
  const [events, setEvents] = useState([]); // flat list
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // AI plan
  const [plan, setPlan] = useState({ loading: true, item: null, nothingToDo: false, err: "" });



  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const gridStart = useMemo(()=> startOfGrid(monthDate), [monthDate]);
  const gridEnd   = useMemo(()=> endOfGrid(monthDate),   [monthDate]);

  // Temporary debugging to identify the issue
  useEffect(() => {
    console.log('Debug dates:', {
      monthDate,
      monthDateType: typeof monthDate,
      monthDateIsDate: monthDate instanceof Date,
      monthDateValid: monthDate instanceof Date ? !isNaN(monthDate.getTime()) : false,
      gridStart,
      gridStartType: typeof gridStart,
      gridStartIsDate: gridStart instanceof Date,
      gridStartValid: gridStart instanceof Date ? !isNaN(gridStart.getTime()) : false,
      selected,
      selectedType: typeof selected
    });
  }, [monthDate, gridStart, selected]);

  const days = useMemo(()=>{
    const arr = [];
    // Ensure gridStart is a valid Date object
    if (!(gridStart instanceof Date) || isNaN(gridStart.getTime())) {
      console.error('Invalid gridStart:', gridStart);
      return [];
    }
    
    for (let i=0;i<42;i++) {
      const date = new Date(gridStart);
      date.setDate(date.getDate() + i);
      arr.push(date);
    }
    return arr;
  }, [gridStart]);

  // Get week view days (7 days starting from selected date)
  const weekDays = useMemo(() => {
    const start = new Date(selected);
    if (isNaN(start.getTime())) {
      console.error('Invalid selected date:', selected);
      return [];
    }
    
    const dayOfWeek = start.getDay();
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      arr.push(date);
    }
    return arr;
  }, [selected]);

  // Get list view events (events for the next 7 days)
  const listViewEvents = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const eventsInRange = events.filter(ev => {
      const eventDate = new Date(ev.date);
      return eventDate >= today && eventDate <= nextWeek;
    });
    
    // Group by date and sort
    const grouped = new Map();
    for (const ev of eventsInRange) {
      if (!grouped.has(ev.date)) {
        grouped.set(ev.date, []);
      }
      grouped.get(ev.date).push(ev);
    }
    
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evs]) => ({
        date,
        events: evs.sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
          return (a.startTime || "99:99").localeCompare(b.startTime || "99:99");
        })
      }));
  }, [events]);

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

  function prevMonth(){ 
    const d = new Date(monthDate); 
    if (isNaN(d.getTime())) {
      console.error('Invalid monthDate in prevMonth:', monthDate);
      return;
    }
    d.setMonth(d.getMonth()-1); 
    setMonthDate(firstOfMonthDate(d)); 
  }
  
  function nextMonth(){ 
    const d = new Date(monthDate); 
    if (isNaN(d.getTime())) {
      console.error('Invalid monthDate in nextMonth:', monthDate);
      return;
    }
    d.setMonth(d.getMonth()+1); 
    setMonthDate(firstOfMonthDate(d)); 
  }
  
  function today(){ 
    const t = firstOfMonthDate(new Date()); 
    setMonthDate(t); 
    setSelected(ymd(new Date())); 
  }

  function prevWeek(){ 
    const d = new Date(selected); 
    d.setDate(d.getDate() - 7); 
    setSelected(ymd(d)); 
  }
  function nextWeek(){ 
    const d = new Date(selected); 
    d.setDate(d.getDate() + 7); 
    setSelected(ymd(d)); 
  }

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

  function toggleViewMode() {
    if (viewMode === "month") {
      setViewMode("week");
    } else if (viewMode === "week") {
      setViewMode("list");
    } else {
      setViewMode("month");
    }
  }

  function getViewModeIcon() {
    switch (viewMode) {
      case "month": return "📅";
      case "week": return "📆";
      case "list": return "📋";
      default: return "📅";
    }
  }

  function getViewModeTitle() {
    switch (viewMode) {
      case "month": return "Month";
      case "week": return "Week";
      case "list": return "List";
      default: return "Month";
    }
  }

  return (
    <div className="calendar-page fade-in">
      {/* Toolbar */}
      <div className="panel calendar-toolbar">
        <div className="kicker">Calendar</div>
        <div className="ui-mono month-year">
          {viewMode === "month" 
            ? monthDate.toLocaleString(undefined, { month:"long", year:"numeric" })
            : viewMode === "week"
            ? `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : "Next 7 Days"
          }
        </div>
        <div className="nav-buttons">
          {viewMode === "month" ? (
            <>
              <button className="btn" onClick={prevMonth}>‹ Prev</button>
              <button className="btn" onClick={today}>Today</button>
              <button className="btn" onClick={nextMonth}>Next ›</button>
            </>
          ) : viewMode === "week" ? (
            <>
              <button className="btn" onClick={prevWeek}>‹ Prev</button>
              <button className="btn" onClick={today}>Today</button>
              <button className="btn" onClick={nextWeek}>Next ›</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={today}>Today</button>
            </>
          )}
        </div>
        <div className="spacer" />
        <div className="view-toggle">
          <button 
            className={`btn ${viewMode === "month" ? "primary" : ""}`} 
            onClick={toggleViewMode}
            title={`Current: ${getViewModeTitle()}. Click to switch view.`}
          >
            {getViewModeIcon()}
          </button>
          <button className="btn" onClick={()=> setModal({ open:true, data:{ date: selected, title:"", allDay:true }})}>New event</button>
        </div>
      </div>

      {/* AI Day Plan */}
      <section className="ai-day-plan">
        <div className="ai-day-plan-header">
          <span className="ai-chip">✨ Day Plan</span>
          <span className="date">{selected}</span>
          <div className="spacer" />
          <button className="btn" onClick={onGeneratePlan} disabled={plan.loading}>
            {plan.loading ? "Planning…" : "Generate plan"}
          </button>
        </div>
        {plan.err && <p className="prose" style={{ color:"crimson" }}>{plan.err}</p>}
        {!plan.loading && plan.nothingToDo && (
          <p className="prose" style={{ margin:0, opacity:0.9 }}>✨ Nothing scheduled today.</p>
        )}
        {!plan.loading && !plan.nothingToDo && plan.item?.agenda?.length > 0 && (
          <ul className="prose">
            {plan.item.agenda.map((b,i)=><li key={i}>{b}</li>)}
          </ul>
        )}
      </section>

      {/* Calendar Views */}
      <div className="card" style={{ padding:12 }}>
        {err && <p className="prose" style={{ color:"crimson" }}>{err}</p>}
        {loading ? <LoadingSpinner text="Loading calendar..." variant="compact" /> : (
          <>
            {/* Month/Week Grid View */}
            {(viewMode === "month" || viewMode === "week") && (
              <div className={`calendar-grid ${viewMode === "week" ? "week-view" : ""}`}>
                <div className="calendar-header">
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>(
                    <div key={i}>{d}</div>
                  ))}
                </div>
                {(viewMode === "month" ? days : weekDays).map((d,i)=>{
                  // Ensure d is a valid Date object
                  if (!(d instanceof Date) || isNaN(d.getTime())) {
                    console.warn('Invalid date object:', d);
                    return null;
                  }
                  
                  const isOtherMonth = viewMode === "month" && d.getMonth() !== monthDate.getMonth();
                  const key = ymd(d);
                  const list = byDate.get(key) || [];
                  const isSelected = key === selected;
                  return (
                    <div
                      key={i}
                      onClick={()=> setSelected(key)}
                      onDoubleClick={()=> setModal({ open:true, data:{ date: key, title:"", allDay:true } })}
                      className={`calendar-day ${isSelected ? 'selected' : ''} ${isOtherMonth ? 'other-month' : ''}`}
                      title="Double-click to create event"
                    >
                      <div className="calendar-day-number">
                        {d.getDate()}
                      </div>

                      <div className="calendar-day-events">
                        {list.slice(0, viewMode === "week" ? 5 : 3).map(ev=>(
                          <button
                            key={ev.id}
                            className={`calendar-event ${ev.allDay ? 'all-day' : 'timed'}`}
                            onClick={(e)=>{ e.stopPropagation(); setModal({ open:true, data: ev }); }}
                            title="Click to edit"
                          >
                            <div className="event-content">
                              <div className="event-time-badge">
                                {ev.allDay ? "All-day" : ev.startTime}
                              </div>
                              <div className="event-title-text">
                                {ev.title}
                              </div>
                            </div>
                          </button>
                        ))}
                        {list.length > (viewMode === "week" ? 5 : 3) && (
                          <div className="calendar-event-count">+{list.length - (viewMode === "week" ? 5 : 3)} more</div>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div className="calendar-list-view">
                {listViewEvents.length === 0 ? (
                  <p className="prose" style={{ textAlign: "center", color: "var(--muted)" }}>
                    No upcoming events in the next 7 days.
                  </p>
                ) : (
                  listViewEvents.map(({ date, events }) => (
                    <div key={date} className="calendar-list-day">
                      <div className="calendar-list-date">
                        {new Date(date).toLocaleDateString(undefined, { 
                          weekday: "short", 
                          month: "short", 
                          day: "numeric" 
                        })}
                      </div>
                      <div className="calendar-list-events">
                        {events.map(ev => (
                          <button
                            key={ev.id}
                            className={`calendar-list-event ${ev.allDay ? 'all-day' : 'timed'}`}
                            onClick={() => setModal({ open: true, data: ev })}
                            title="Click to edit"
                          >
                            <div className="event-time">
                              {ev.allDay ? "All-day" : ev.startTime}
                            </div>
                            <div className="event-title">{ev.title}</div>
                            {ev.location && <div className="event-location">📍 {ev.location}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
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
    <div className="event-modal" onClick={onClose}>
      <div className="event-modal-content" onClick={e=>e.stopPropagation()}>
        <div className="event-modal-header">
          <div className="kicker">{f.id ? "Edit event" : "New event"}</div>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <form className="event-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="event-form-row">
            <label>Title</label>
            <input 
              value={f.title} 
              onChange={e=>update("title", e.target.value)} 
              placeholder="Event title" 
              required
            />
          </div>

          <div className="event-form-row two-columns">
            <div>
              <label>Date</label>
              <input type="date" value={f.date} onChange={e=>update("date", e.target.value)} required />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
              <label className="ui-mono" style={{ fontSize: 12 }}>
                <input type="checkbox" checked={f.allDay} onChange={e=>update("allDay", e.target.checked)} />
                &nbsp;All-day
              </label>
            </div>
          </div>

          {!f.allDay && (
            <div className="event-form-row two-columns">
              <div>
                <label>Start</label>
                <input type="time" value={f.startTime} onChange={e=>update("startTime", e.target.value)} required />
              </div>
              <div>
                <label>End</label>
                <input type="time" value={f.endTime} onChange={e=>update("endTime", e.target.value)} required />
              </div>
            </div>
          )}

          <div className="event-form-row">
            <label>Location</label>
            <input value={f.location} onChange={e=>update("location", e.target.value)} placeholder="Optional" />
          </div>

          <div className="event-form-row">
            <label>Details</label>
            <textarea
              className="editor-body"
              rows={4}
              value={f.description}
              onChange={e=>update("description", e.target.value)}
              placeholder="Notes, context, links…"
            />
          </div>

          <div className="event-form-actions">
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {f.id && (
              <button type="button" className="btn" onClick={handleDelete} disabled={saving}>
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
