import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as api from "./articles.api";
import "../../styles/journal.css"; // reuse tokens + cards
import "./articles.css";          // styles below

function hostFromUrl(u){ try{ return new URL(u).host.replace(/^www\./,""); } catch { return ""; } }
function initials(host=""){ const h = host.replace(/\.[a-z]+$/i,"").split(".").pop() || host; return h.slice(0,2).toUpperCase(); }

export default function ArticlesList(){
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [source, setSource] = useState(""); // host filter
  const [diverse, setDiverse] = useState(true);

  const limit = 30;

  async function load(p = 1){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const params = new URLSearchParams({ page: String(p), limit: String(limit), q });
      const { items, total } = await api.list(token, Object.fromEntries(params));
      setItems(items || []); setTotal(total || 0); setPage(p);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if(token) load(1); }, [token]);        // initial
  useEffect(()=>{ if(token) load(1); }, [q]);            // search

  async function onRefresh(){
    if(!token) return;
    setLoading(true);
    try{
      // grab a few more for variety, force deep fetch
      await api.refresh(token, 24, true);
      await load(1);
    }catch(e){ setErr(e.message); setLoading(false); }
  }

  // source list (chips)
  const hosts = useMemo(()=>{
    const set = new Set(items.map(a => hostFromUrl(a.url)).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  // diversity toggle: keep at most N per source (default 2)
  const filtered = useMemo(()=>{
    let arr = items;
    if (source) arr = arr.filter(a => hostFromUrl(a.url) === source);
    if (!diverse) return arr;
    const cap = 2;
    const seen = new Map();
    const out = [];
    for (const a of arr){
      const h = hostFromUrl(a.url) || "other";
      const n = seen.get(h) || 0;
      if (n >= cap) continue;
      seen.set(h, n + 1);
      out.push(a);
    }
    return out;
  }, [items, source, diverse]);

  return (
    <div className="fade-in page">
      {/* toolbar */}
      <div className="panel" style={{ padding: 12, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        <div className="kicker">Articles</div>
        <form onSubmit={(e)=>{ e.preventDefault(); load(1); }} style={{ display:"flex", gap:8 }}>
          <input placeholder="Search titles…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn">Search</button>
        </form>
        <div style={{ flex:1 }} />
        <label className="ui-mono" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <input type="checkbox" checked={diverse} onChange={e=>setDiverse(e.target.checked)} />
          Diversity by source
        </label>
        <button className="btn" onClick={onRefresh}>Refresh sources</button>
      </div>

      {/* source chips */}
      {hosts.length > 0 && (
        <div className="panel" style={{ padding: 12, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <span className="kicker">Sources</span>
          <button className={`chip ${!source ? "chip-active" : ""}`} onClick={()=>setSource("")}>All</button>
          {hosts.map(h => (
            <button key={h} className={`chip ${source===h?"chip-active":""}`} onClick={()=>setSource(h)}>{h}</button>
          ))}
        </div>
      )}

      {err && <p className="prose" style={{ color:"crimson" }}>{err}</p>}
      {loading ? <p className="prose">Loading…</p> : (
        filtered.length === 0 ? <p className="prose">No articles found.</p> : (
          <section className="a-grid">
            {/* Hero card (first item) */}
            {filtered[0] && <ArticleCard a={filtered[0]} hero />}
            {/* Rest */}
            {filtered.slice(1).map(a => <ArticleCard key={a.id} a={a} />)}
          </section>
        )
      )}

      {/* simple pager */}
      <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"center" }}>
        <button className="btn" disabled={page<=1} onClick={()=>load(page-1)}>Prev</button>
        <span className="kicker">Page {page}</span>
        <button className="btn" disabled={items.length < limit} onClick={()=>load(page+1)}>Next</button>
      </div>
    </div>
  );
}

function ArticleCard({ a, hero=false }){
  const host = hostFromUrl(a.url);
  const img = a.imageUrl || "";
  const reading = a.readingMins ? `~${a.readingMins} min` : "";
  const className = hero ? "a-card a-hero card" : "a-card card";
  return (
    <article className={className}>
      <div className="a-imgwrap">
        {img ? (
          <img className="a-img" src={img} alt="" loading="lazy" />
        ) : (
          <div className="a-img a-placeholder">
            <span className="ui-mono">{initials(host || "news")}</span>
          </div>
        )}
        {host && <div className="a-badge ui-mono">{host}</div>}
      </div>

      <div className="a-body">
        <Link to={`/articles/${a.id}`} className="a-title ui-mono">{a.title || "(untitled)"}</Link>
        {a.excerpt && <p className="prose a-excerpt">{a.excerpt}</p>}
        <div className="a-meta">
          {reading && <span className="chip">{reading}</span>}
          <a className="btn" href={a.url} target="_blank" rel="noreferrer">Original</a>
          <Link className="btn" to={`/articles/${a.id}`}>Saved copy</Link>
        </div>
      </div>
    </article>
  );
}
