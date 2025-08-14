import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as api from "../features/journal/journal.api";
import "../styles/journal.css";

function snippet(t="", n=180){ const s=(t||"").replace(/\s+/g," ").trim(); return s.length>n? s.slice(0,n-1)+"…" : s; }

export default function PressFeed(){
  const [params] = useSearchParams();
  const [state,setState] = useState({ loading:true, err:"", items:[], page:1, total:0 });
  const [q,setQ] = useState(params.get("q") || "");

  async function load(page=1){
    setState(s=>({ ...s, loading:true, err:"" }));
    try{
      const { items, total } = await api.listPublic({ page, limit: 24, q });
      setState({ loading:false, err:"", items, page, total });
    }catch(e){
      setState({ loading:false, err:e.message, items:[], page:1, total:0 });
    }
  }
  useEffect(()=>{ load(1); /* eslint-disable-next-line */ }, [q]);

  return (
    <div className="j-home fade-in">
      <div className="j-toolbar">
        <div className="kicker">Pressroom</div>
        <div style={{flex:1}} />
        <form onSubmit={(e)=>{ e.preventDefault(); load(1); }} style={{display:"flex", gap:8}}>
          <input placeholder="Search journals…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn">Search</button>
        </form>
      </div>

      {state.err && <p className="prose" style={{color:"crimson"}}>{state.err}</p>}
      {state.loading ? <p className="prose">Loading…</p> : (
        state.items.length === 0 ? <p className="prose">No published journals yet.</p> : (
          <section className="j-more">
            {state.items.map(j=>(
              <article key={j.id} className="j-card">
                <Link to={`/press/${j.slug}`} className="j-link"><h3 className="j-hed">{j.title || "Untitled"}</h3></Link>
                <p className="prose j-excerpt">{snippet(j.body)}</p>
                <div className="j-meta">
                  <span>{j.date}</span>
                  {j.tags?.length ? <span>• {j.tags.join(", ")}</span> : null}
                </div>
              </article>
            ))}
          </section>
        )
      )}
    </div>
  );
}
