import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as api from "./articles.api";
import { useArticlesList } from "../../hooks/useOptimizedFetch";
import LoadingSpinner from "../../components/LoadingSpinner";
import "../../styles/journal.css"; // reuse tokens + cards
import "../../styles/responsive.css"; // responsive design system
import "./articles.css";          // styles below

function hostFromUrl(u){ try{ return new URL(u).host.replace(/^www\./,""); } catch { return ""; } }
function initials(host=""){ const h = host.replace(/\.[a-z]+$/i,"").split(".").pop() || host; return h.slice(0,2).toUpperCase(); }

export default function ArticlesList(){
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [source, setSource] = useState(""); // host filter
  const [diverse, setDiverse] = useState(true);

  const limit = 30;

  // Use optimized fetching hook
  const { 
    data, 
    loading, 
    error, 
    refresh, 
    isStale 
  } = useArticlesList(token, {
    page,
    limit,
    search: q,
    immediate: !!token,
    enableBackgroundRefresh: false,
    staleTime: 300000 // 5 minutes
  });

  // Extract items and total from data
  const items = data?.items || [];
  const total = data?.total || 0;

  // Debounced search to avoid excessive API calls
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (searchTerm) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setQ(searchTerm);
        }, 300); // 300ms delay
      };
    })(),
    []
  );

  const onRefresh = useCallback(async () => {
    if(!token) return;
    try{
      // Use optimized refresh with progress indication
      await api.refresh(token, 24, true);
      refresh(); // Refresh the cached data
    }catch(e){ 
      console.error("Refresh failed:", e); 
    }
  }, [token, refresh]);

  // Pagination function
  const load = useCallback((newPage) => {
    setPage(newPage);
  }, []);

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
      {/* responsive toolbar */}
      <div className="j-toolbar toolbar-responsive">
        <div className="toolbar-left">
          <div className="kicker">Articles</div>
          <form onSubmit={(e)=>{ e.preventDefault(); }} className="search-responsive">
            <input 
              className="input-responsive"
              placeholder="Search titles…" 
              defaultValue={q} 
              onChange={e => debouncedSearch(e.target.value)} 
            />
            <button className="btn btn-responsive" type="button" onClick={() => refresh()}>Search</button>
          </form>
        </div>
        
        <div className="toolbar-right">
          {/* Performance indicators */}
          <div className="flex-responsive-sm">
            {isStale && (
              <span className="kicker" style={{ 
                color: "#f59e0b", 
                padding: "4px 8px", 
                background: "#fef3c7", 
                borderRadius: "var(--radius-1)",
                border: "1px solid #fbbf24"
              }}>
                Stale data
              </span>
            )}
            {items.length > 0 && (
              <span className="kicker" style={{ 
                color: "#10b981", 
                padding: "4px 8px", 
                background: "#d1fae5", 
                borderRadius: "var(--radius-1)",
                border: "1px solid #34d399"
              }}>
                {items.length} articles
              </span>
            )}
          </div>
          
          <div className="flex-responsive-sm">
            <label className="ui-mono" style={{ display:"flex", alignItems:"center", gap:6 }}>
              <input type="checkbox" checked={diverse} onChange={e=>setDiverse(e.target.checked)} />
              Diversity by source
            </label>
            <button className="btn btn-responsive" onClick={onRefresh}>Refresh sources</button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 12, border: "1px solid #fca5a5", background: "#fef2f2" }}>
          <p style={{ color: "#dc2626", margin: "0 0 10px 0" }}>Error loading articles: {error}</p>
          <button className="btn" onClick={refresh}>Retry</button>
        </div>
      )}

            {/* source chips */}
      {hosts.length > 0 && (
        <div className="j-toolbar toolbar-responsive">
          <div className="toolbar-left">
            <span className="kicker">Sources</span>
            <div className="flex-responsive-sm">
              <button className={`chip ${!source ? "chip-active" : ""}`} onClick={()=>setSource("")}>All</button>
              {hosts.map(h => (
                <button key={h} className={`chip ${source===h?"chip-active":""}`} onClick={()=>setSource(h)}>{h}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="card error-responsive" style={{ border: "1px solid #fca5a5", background: "#fef2f2" }}>
          <p style={{ color: "#dc2626", margin: "0 0 10px 0" }}>Error loading articles: {error}</p>
          <button className="btn btn-responsive" onClick={refresh}>Retry</button>
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="loading-responsive">
          <LoadingSpinner text="Loading articles..." variant="compact" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-responsive">
          <p className="prose">No articles found.</p>
        </div>
      ) : (
        <section className="a-grid">
          {/* Hero card (first item) */}
          {filtered[0] && <ArticleCard a={filtered[0]} hero />}
          {/* Rest */}
          {filtered.slice(1).map(a => <ArticleCard key={a.id} a={a} />)}
        </section>
      )}

      {/* responsive pager */}
      <div className="pagination-responsive">
        <button className="btn btn-responsive" disabled={page<=1} onClick={()=>load(page-1)}>Prev</button>
        <span className="kicker">Page {page}</span>
        <button className="btn btn-responsive" disabled={filtered.length < limit} onClick={()=>load(page+1)}>Next</button>
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
          <img 
            className="a-img" 
            src={img} 
            alt="" 
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
        ) : null}
        <div className="a-img a-placeholder" style={{ display: img ? 'none' : 'block' }}>
          <span className="ui-mono">{initials(host || "news")}</span>
        </div>
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
