import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as api from "./articles.api";
import * as ai from "../ai/ai.api";
import { sanitizeArticle } from "../../lib/sanitize";
import "../../styles/reader.css";

function hostFromUrl(u) {
  try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; }
}

export default function ReaderPage() {
  const { id } = useParams();
  const { token } = useAuth();

  const [state, setState] = useState({ loading: true, err: "", article: null });
  const [progress, setProgress] = useState(0);
  const contentRef = useRef(null);

  // AI summary state (modes: "tldr" | "detailed" | "outline")
  const [aiState, setAiState] = useState({ loading: false, summary: "", err: "", mode: "detailed" });


  // Fetch article
  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const { item } = await api.getOne(token, id);
        if (!mounted) return;
        const clean = sanitizeArticle(item.contentHTML || "");
        setState({ loading: false, err: "", article: { ...item, contentHTML: clean } });
        setAiState({ loading: false, summary: "", err: "", mode: "tldr" }); // reset AI box on article change
      } catch (e) {
        if (mounted) setState({ loading: false, err: e.message, article: null });
      }
    }
    if (token) run();
    return () => { mounted = false; };
  }, [token, id]);

  // Reading progress
  useEffect(() => {
    function onScroll() {
      const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const p = Math.min(Math.max(window.scrollY / total, 0), 1);
      setProgress(p);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // AI summarizer
  async function runAISummary(nextMode = aiState.mode) {
    const articleId = state.article?.id;
    if (!token || !articleId) return;
    setAiState({ loading: true, summary: "", err: "", mode: nextMode });
    try {
      const { summary } = await ai.summarize(token, { articleId, mode: nextMode });
      setAiState({ loading: false, summary, err: "", mode: nextMode });
    } catch (e) {
      setAiState({ loading: false, summary: "", err: e.message, mode: nextMode });
    }
  }

  if (!token) return <p className="prose">Please log in to view this article.</p>;
  if (state.loading) return <p className="prose">Loading…</p>;
  if (state.err) return <p className="prose" style={{ color: "crimson" }}>{state.err}</p>;

  const a = state.article;

  return (
    <div className="reader-wrap fade-in">
      <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} />

      <article className="reader">
        <header className="reader-head">
          <h2 className="reader-title">{a.title}</h2>
          <div className="reader-meta">
            {a.byline && <span className="chip">By {a.byline}</span>}
            <span className="chip">{hostFromUrl(a.url)}</span>
            <span className="chip">~{a.readingMins} min</span>
            <a className="btn" href={a.url} target="_blank" rel="noreferrer">Original</a>
          </div>
        </header>

        {/* AI Summary (rainbow glow card) */}
        <section className="ai-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span className="ai-chip">✨ AI Summary</span>
            <div className="ui-mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              Mode: {aiState.mode.toUpperCase()}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => runAISummary("tldr")} disabled={aiState.loading}>
                TL;DR
              </button>
              <button className="btn" onClick={() => runAISummary("detailed")} disabled={aiState.loading}>
                Detailed
              </button>
              <button className="btn" onClick={() => runAISummary("outline")} disabled={aiState.loading}>
                Outline
              </button>
            </div>
          </div>

          {aiState.err && <p className="prose" style={{ color: "crimson" }}>{aiState.err}</p>}

          {aiState.summary ? (
            aiState.mode === "outline" ? (
              <ul className="prose" style={{ margin: 0, paddingLeft: "1.2em" }}>
                {aiState.summary.split("\n").map((line, i) => (
                  <li key={i}>{line.replace(/^[-•\s]+/, "")}</li>
                ))}
              </ul>
            ) : (
              <p className="prose" style={{ margin: 0 }}>{aiState.summary}</p>
            )
          ) : (
            <p className="prose" style={{ margin: 0, color: "var(--muted)" }}>
              Choose a mode to generate a summary.
            </p>
          )}
        </section>

        <div
          ref={contentRef}
          className="reader-content prose"
          dangerouslySetInnerHTML={{ __html: a.contentHTML || "<p>(No content)</p>" }}
        />
      </article>
    </div>
  );
}
