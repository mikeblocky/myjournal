import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/journal/journal.api";
import JournalList from "../features/journal/JournalList";
import JournalEditor from "../features/journal/JournalEditor";
import { Link } from "react-router-dom";

export default function JournalPage(){
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null); // {id,...} or null/new

  async function load(page=1){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const { items } = await api.list(token, { page, q });
      setList(items);
      if (!selected && items[0]) setSelected(items[0]);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if(token) load(); },[token]);

  function onNew(){
    setSelected({ title:"", body:"", date: new Date().toISOString(), tags: [] });
  }

  async function onSave(payload){
    try{
      setSaving(true);
      if (!selected?.id) {
        const { item } = await api.create(token, payload);
        await load(1);
        setSelected(item);
      } else {
        const { item } = await api.update(token, selected.id, payload);
        setSelected(item);
        // reflect in list
        setList(prev => prev.map(x => x.id === item.id ? item : x));
      }
    }catch(e){ setErr(e.message); }
    finally{ setSaving(false); }
  }

  async function onDelete(){
    if (!selected?.id) { setSelected(null); return; }
    try{
      setSaving(true);
      await api.remove(token, selected.id);
      const next = list.filter(x => x.id !== selected.id);
      setList(next);
      setSelected(next[0] || null);
    }catch(e){ setErr(e.message); }
    finally{ setSaving(false); }
  }

  if (!token) return <p className="prose">Please <Link to="/login">log in</Link> to write your journals.</p>;

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <div>
        {err && <p className="prose" style={{ color:"crimson" }}>{err}</p>}
        {loading
          ? <p className="prose">Loading…</p>
          : <JournalList
              items={list}
              selectedId={selected?.id}
              onSelect={setSelected}
              onNew={onNew}
              onSearch={()=>load(1)}
              q={q}
              setQ={setQ}
            />
        }
      </div>

      <div>
        <JournalEditor
          entry={selected || { }}
          onSave={onSave}
          onDelete={onDelete}
          saving={saving}
        />
      </div>

      {/* responsive: stack on small screens */}
      <style>{`
        @media (max-width: 900px){
          .fade-in{ display:block }
        }
      `}</style>
    </div>
  );
}
