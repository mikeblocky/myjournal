import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import * as api from "../features/journal/journal.api";
import JournalEditor from "../features/journal/JournalEditor";

export default function JournalWrite(){
  const { token } = useAuth();
  const nav = useNavigate();
  const [saving,setSaving]=useState(false);
  const [created,setCreated]=useState(null);
  const entry = { title:"", body:"", tags:[], date: new Date().toISOString().slice(0,10) };

  async function onSave(payload){
    setSaving(true);
    try{
      const { item } = await api.create(token, payload);
      setCreated(item);
      // stay here so user can keep editing or publish
    } finally { setSaving(false); }
  }

  async function onPublish(){
    if(!created?.id) return;
    setSaving(true);
    try{
      const { item } = await api.publish(token, created.id);
      nav(`/press/${item.slug}`);
    } finally { setSaving(false); }
  }

  return (
    <div className="fade-in" style={{display:"grid", gap:16}}>
      <div className="j-toolbar">
        <div className="kicker">New journal</div>
        <div style={{flex:1}} />
        <Link to="/journal" className="btn">Back to journals</Link>
      </div>

      <JournalEditor entry={entry} onSave={onSave} saving={saving} />

      <div className="panel" style={{padding:12, display:"flex", gap:8, alignItems:"center"}}>
        <span className="kicker">{created ? "Saved draft" : "Draft not saved yet"}</span>
        <div style={{flex:1}} />
        <button className="btn" disabled={!created || saving} onClick={onPublish}>
          {saving ? "Publishing…" : "Publish to Pressroom"}
        </button>
      </div>
    </div>
  );
}
