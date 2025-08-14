import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/notes/notes.api";

function todayUTC(){ return new Date().toISOString().slice(0,10); }

export default function NotesPage(){
  const { token } = useAuth();
  const [date, setDate] = useState(todayUTC());
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({ title:"", body:"" });
  const [saving, setSaving] = useState(false);

  const [daily, setDaily] = useState({ loading: true, item: null, nothingToDo: false, err: "" });

  async function loadNotes(){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const { items } = await api.list(token, { date, limit: 200 });
      setList(items);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  async function loadDaily(){
    if(!token) return;
    setDaily(s => ({ ...s, loading: true, err: "" }));
    try{
      const { item } = await api.getDaily(token, date);
      setDaily({ loading:false, item, nothingToDo: !item || (item.bullets||[]).length===0, err:"" });
    }catch(e){ setDaily({ loading:false, item:null, nothingToDo:true, err:e.message }); }
  }

  useEffect(()=>{ if(token){ loadNotes(); loadDaily(); } }, [token, date]);

  async function onCreate(e){
    e.preventDefault();
    if(!form.title && !form.body) return;
    setSaving(true);
    try{
      await api.create(token, { title: form.title, body: form.body, date });
      setForm({ title:"", body:"" });
      await loadNotes();
      // reset daily summary (user changed notes)
      setDaily(d=>({ ...d, item:null, nothingToDo:false }));
    }finally{ setSaving(false); }
  }

  async function toggleDone(n){
    try{
      await api.update(token, n.id, { done: !n.done });
      setList(ls => ls.map(x => x.id === n.id ? { ...x, done: !x.done } : x));
    }catch(e){ /* ignore */ }
  }

  async function handleGenerateDaily(){
    setDaily({ loading:true, item:null, nothingToDo:false, err:"" });
    try{
      const res = await api.generateDaily(token, date);
      setDaily({ loading:false, item: res.item, nothingToDo: res.nothingToDo || (res.item?.bullets?.length===0), err:"" });
    }catch(e){
      setDaily({ loading:false, item:null, nothingToDo:true, err:e.message });
    }
  }

  return (
    <div className="fade-in" style={{ display:"grid", gap:16 }}>
      <div className="panel" style={{ padding:12, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
        <div className="kicker">Notes</div>
        <label className="ui-mono" style={{ display:"flex", alignItems:"center", gap:8 }}>
          Date:
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <div style={{ flex:1 }} />
        <button className="btn" onClick={loadNotes}>Reload</button>
      </div>

      {/* AI daily summary */}
      <section className="ai-card" style={{ padding:16 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
          <span className="ai-chip">✨ Daily AI Notes</span>
          <span className="kicker">{date}</span>
          <div style={{ flex:1 }} />
          <button className="btn" onClick={handleGenerateDaily} disabled={daily.loading}>
            {daily.loading ? "Summarizing…" : "Summarize today"}
          </button>
        </div>

        {daily.err && <p className="prose" style={{ color:"crimson" }}>{daily.err}</p>}

        {!daily.loading && daily.nothingToDo && (list.length === 0) && (
          <p className="prose" style={{ margin:0, color:"var(--muted)" }}>✨ Nothing to do today.</p>
        )}

        {!daily.loading && !daily.nothingToDo && daily.item?.bullets?.length > 0 && (
          <ul className="prose" style={{ margin:0, paddingLeft:"1.2em" }}>
            {daily.item.bullets.map((b,i)=><li key={i}>{b}</li>)}
          </ul>
        )}

        {!daily.loading && !daily.item && list.length > 0 && (
          <p className="prose" style={{ margin:0, color:"var(--muted)" }}>No summary yet. Click “Summarize today”.</p>
        )}
      </section>

      {/* Add note */}
      <form onSubmit={onCreate} className="card" style={{ padding:16, display:"grid", gap:8 }}>
        <label>Title</label>
        <input
          placeholder="Quick note title"
          value={form.title}
          onChange={e=>setForm(f=>({ ...f, title: e.target.value }))}
        />
        <label>Details</label>
        <textarea
          className="editor-body"
          placeholder="Write a few lines…"
          rows={5}
          value={form.body}
          onChange={e=>setForm(f=>({ ...f, body: e.target.value }))}
        />
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Add note"}</button>
        </div>
      </form>

      {/* List notes */}
      <section className="card" style={{ padding:16 }}>
        {err && <p className="prose" style={{ color:"crimson" }}>{err}</p>}
        {loading ? <p className="prose">Loading…</p> : (
          list.length === 0 ? <p className="prose" style={{ margin:0 }}>No notes for {date}.</p> : (
            <ul style={{ listStyle:"none", padding:0, margin:0, display:"grid", gap:10 }}>
              {list.map(n=>(
                <li key={n.id} className="panel" style={{ padding:12, display:"grid", gap:6 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <input type="checkbox" checked={n.done} onChange={()=>toggleDone(n)} />
                    <div className="ui-mono" style={{ fontWeight:600 }}>{n.title || "(untitled)"}</div>
                    {n.pinned && <span className="chip">Pinned</span>}
                    <div style={{ flex:1 }} />
                    <span className="chip">{n.date}</span>
                  </div>
                  {n.body && <p className="prose" style={{ margin:0 }}>{n.body}</p>}
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </div>
  );
}
