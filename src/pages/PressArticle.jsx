import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import * as api from "../features/journal/journal.api";
import "../styles/reader.css";

export default function PressArticle(){
  const { slug } = useParams();
  const [state,setState] = useState({ loading:true, err:"", item:null });

  useEffect(()=>{
    let on = true;
    async function run(){
      try{
        const { item } = await api.getPublic(slug);
        if(on) setState({ loading:false, err:"", item });
      }catch(e){ if(on) setState({ loading:false, err:e.message, item:null }); }
    }
    run();
    return ()=>{ on=false; };
  },[slug]);

  if (state.loading) return <p className="prose">Loading…</p>;
  if (state.err) return <p className="prose" style={{color:"crimson"}}>{state.err}</p>;
  if (!state.item) return <p className="prose">Not found.</p>;

  const j = state.item;

  return (
    <article className="reader fade-in">
      <header className="reader-head">
        <h2 className="reader-title">{j.title || "Untitled"}</h2>
        <div className="reader-meta">
          <span className="chip">{j.date}</span>
          {j.tags?.length ? <span className="chip">{j.tags.join(", ")}</span> : null}
          <Link className="btn" to="/press">Back to Pressroom</Link>
        </div>
      </header>
      <div className="reader-content prose">
        {j.body?.split("\n\n").map((p,i)=><p key={i}>{p}</p>)}
      </div>
    </article>
  );
}
