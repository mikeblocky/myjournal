import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/journal/journal.api";
import { timeAgo } from "../lib/date";
import "../styles/reader.css";

export default function JournalView(){
  const { id } = useParams();
  const { token } = useAuth();
  const nav = useNavigate();
  const [state,setState]=useState({loading:true, err:"", item:null});

  useEffect(()=>{
    let on = true;
    async function run(){
      try{
        const { item } = await api.getOne(token, id);
        if(on) setState({ loading:false, err:"", item });
      }catch(e){ if(on) setState({ loading:false, err:e.message, item:null }); }
    }
    if(token) run();
    return ()=>{ on=false; };
  },[token, id]);

  if(!token) return <p className="prose">Please <Link to="/login">log in</Link>.</p>;
  if(state.loading) return <p className="prose">Loading…</p>;
  if(state.err) return <p className="prose" style={{color:"crimson"}}>{state.err}</p>;

  const j = state.item;

  return (
    <article className="reader fade-in">
      <header className="reader-head">
        <h2 className="reader-title">{j.title || "Untitled"}</h2>
        <div className="reader-meta">
          <span className="chip">{timeAgo(j.date || j.createdAt)}</span>
          {j.tags?.length ? <span className="chip">{j.tags.join(", ")}</span> : null}
          <Link className="btn" to="/journal">All journals</Link>
        </div>
      </header>

      <div className="reader-content prose">
        {j.body?.split("\n\n").map((para, i)=> <p key={i}>{para}</p>)}
      </div>

      <div style={{marginTop:16}}>
        <button className="btn" onClick={()=>nav(`/journal/new`)}>Write another</button>
      </div>
    </article>
  );
}
