import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/journal/journal.api";
import { Link, useNavigate } from "react-router-dom";
import { timeAgo } from "../lib/date";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/journal.css";

function snippet(t="", n=140){ const s=(t||"").replace(/\s+/g," ").trim(); return s.length>n? s.slice(0,n-1)+"…" : s; }

const SAMPLE = [
  {
    title: "Morning brief by the window",
    body: "Grey light, soft rain. Read about ceasefire talks and supply chains. What struck me: the language people use when they’re tired—short, declarative, unadorned. I wrote two lines I want to keep.",
    tags: ["morning","reading"],
  },
  {
    title: "Campus walk: jacaranda path",
    body: "Petals gathered at the curb like purple confetti. I didn’t take a photo. It felt better to just keep it in my pocket as a sentence.",
    tags: ["walk","campus"],
  },
  {
    title: "On attention",
    body: "I saved three articles but finished none. Still, the small notes I took felt honest. Maybe that’s the point—the keeping, not the finishing.",
    tags: ["reflection"],
  },
  {
    title: "A slow headline day",
    body: "No big stories, only quiet ones: a local library grant, a small town water vote. I like these; they give me room to breathe.",
    tags: ["news","quiet"],
  },
  {
    title: "Evening reread",
    body: "Revisited an old journal from last year. The voice was shakier but kinder. I want to keep that tone.",
    tags: ["evening","reread"],
  }
];

export default function JournalHome(){
  const { token } = useAuth();
  const nav = useNavigate();
  const [loading,setLoading] = useState(true);
  const [err,setErr] = useState("");
  const [items,setItems] = useState([]);

  async function load(){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const { items } = await api.list(token, { page:1, limit:30, archived:false });
      setItems(items);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if(token) load(); },[token]);

  async function seedSamples(){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const today = new Date();
      for (let i=0; i<SAMPLE.length; i++){
        const d = new Date(today.getTime() - i*86400000);
        await api.create(token, { ...SAMPLE[i], date: d.toISOString().slice(0,10) });
      }
      await load();
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  if(!token){
    return <p className="prose">Please <Link to="/login">log in</Link> to view your journals.</p>;
  }

  // Layout slices
  const [hero, ...rest] = items;
  const seconds = rest.slice(0,2);
  const rail = rest.slice(2,9);
  const more = rest.slice(9,21);

  return (
    <div className="j-home fade-in">
      {/* toolbar */}
      <div className="j-toolbar">
        <div className="kicker">Journals</div>
        <div className="spacer" />
        <button className="btn primary" onClick={()=>nav("/journal/new")}>Write a journal</button>
      </div>

      {err && <p className="prose" style={{color:"crimson"}}>{err}</p>}

      {loading ? <LoadingSpinner text="Loading journals..." variant="compact" /> : (
        items.length === 0 ? (
          <div className="card" style={{padding:16}}>
            <p className="prose" style={{margin:"0 0 10px 0"}}>No journals yet.</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn primary" onClick={()=>nav("/journal/new")}>Write your first</button>
              <button className="btn" onClick={seedSamples}>Add sample journals</button>
            </div>
          </div>
        ) : (
          <>
            <div className="j-grid">
              {/* left content */}
              <section className="j-left">
                {/* hero */}
                {hero && (
                  <article className="j-hero">
                    <Link to={`/journal/${hero.id}`} className="j-link">
                      <h2 className="j-title">{hero.title || "Untitled"}</h2>
                    </Link>
                    <p className="prose j-excerpt">{snippet(hero.body, 220)}</p>
                    <div className="j-meta">
                      <span>{timeAgo(hero.date || hero.createdAt)}</span>
                      {hero.tags?.length ? <span>• {hero.tags.join(", ")}</span> : null}
                    </div>
                  </article>
                )}

                {/* two secondary */}
                {seconds.map(s => (
                  <article key={s.id} className="j-card">
                    <Link to={`/journal/${s.id}`} className="j-link">
                      <h3 className="j-hed">{s.title || "Untitled"}</h3>
                    </Link>
                    <p className="prose j-excerpt">{snippet(s.body, 160)}</p>
                    <div className="j-meta">
                      <span>{timeAgo(s.date || s.createdAt)}</span>
                      {s.tags?.length ? <span>• {s.tags.join(", ")}</span> : null}
                    </div>
                  </article>
                ))}
              </section>

              {/* right rail */}
              <aside className="j-rail">
                {rail.map(r => (
                  <article key={r.id} className="j-rail-card">
                    <div className="j-kicker">{timeAgo(r.date || r.createdAt)}</div>
                    <Link to={`/journal/${r.id}`} className="j-link">
                      <h4 className="j-rail-hed">{r.title || "Untitled"}</h4>
                    </Link>
                    <p className="prose" style={{margin:"6px 0 0 0"}}>{snippet(r.body, 100)}</p>
                  </article>
                ))}
              </aside>
            </div>

            {/* more grid */}
            {more.length > 0 && (
              <section className="j-more">
                {more.map(m => (
                  <article key={m.id} className="j-card">
                    <Link to={`/journal/${m.id}`} className="j-link">
                      <h3 className="j-hed">{m.title || "Untitled"}</h3>
                    </Link>
                    <p className="prose j-excerpt">{snippet(m.body, 120)}</p>
                    <div className="j-meta">
                      <span>{timeAgo(m.date || m.createdAt)}</span>
                      {m.tags?.length ? <span>• {m.tags.join(", ")}</span> : null}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
