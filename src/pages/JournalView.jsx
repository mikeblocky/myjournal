import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/journal/journal.api";
import { timeAgo } from "../lib/date";
import "../styles/reader.css";

function isOutlineContent(text) {
  if (!text) return false;
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return false;
  
  // Check if most lines start with bullet points
  const bulletLines = lines.filter(line => /^[•\-\*]\s/.test(line.trim()));
  return bulletLines.length >= lines.length * 0.7; // 70% threshold
}

function renderContent(body) {
  if (!body) return null;
  
  if (isOutlineContent(body)) {
    // Render as outline with proper bullet formatting
    return (
      <ul className="prose" style={{ 
        margin: 0, 
        paddingLeft: "1.2em",
        listStyle: "none"
      }}>
        {body.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          
          // Extract content after bullet
          const content = trimmed.replace(/^[•\-\*]\s*/, '');
          if (!content) return null;
          
          return (
            <li key={i} style={{
              marginBottom: "0.5em",
              position: "relative",
              paddingLeft: "1.2em"
            }}>
              <span style={{
                position: "absolute",
                left: 0,
                color: "var(--accent)",
                fontWeight: "500"
              }}>•</span>
              {content}
            </li>
          );
        })}
      </ul>
    );
  } else {
    // Render as regular paragraphs
    return body.split("\n\n").map((para, i) => (
      <p key={i}>{para}</p>
    ));
  }
}

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
  const isOutline = isOutlineContent(j.body);

  return (
    <article className="reader fade-in">
      <header className="reader-head">
        <h2 className="reader-title">{j.title || "Untitled"}</h2>
        <div className="reader-meta">
          <span className="chip">{timeAgo(j.date || j.createdAt)}</span>
          {isOutline && <span className="chip" style={{ backgroundColor: "var(--accent)", color: "white" }}>📋 Outline</span>}
          {j.tags?.length ? <span className="chip">{j.tags.join(", ")}</span> : null}
          <Link className="btn" to="/journal">All journals</Link>
        </div>
      </header>

      <div className="reader-content prose">
        {renderContent(j.body)}
      </div>

      <div style={{marginTop:16}}>
        <button className="btn" onClick={()=>nav(`/journal/new`)}>Write another</button>
      </div>
    </article>
  );
}
