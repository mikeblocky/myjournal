import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as api from "./articles.api";
import * as ai from "../ai/ai.api";
import { sanitizeArticle } from "../../lib/sanitize";
import LoadingSpinner from "../../components/LoadingSpinner";
import "../../styles/reader.css";
import "../../styles/ai.css";
import "../../styles/responsive.css";

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
  if (state.loading) return <LoadingSpinner text="Loading article..." variant="compact" />;
  if (state.err) return <p className="prose" style={{ color: "crimson" }}>{state.err}</p>;

  const a = state.article;

  return (
    <div className="reader-wrap fade-in page container">
      <div className="reading-progress" style={{ transform: `scaleX(${progress})` }} />

      <article className="reader">
        <header className="reader-head">
          <h2 className="reader-title text-responsive-xl">{a.title}</h2>
          <div className="reader-meta flex-responsive-sm">
            {a.byline && <span className="chip">By {a.byline}</span>}
            <span className="chip">{hostFromUrl(a.url)}</span>
            <span className="chip">~{a.readingMins} min</span>
            <div className="btn-group-responsive">
              <a className="btn btn-responsive" href={a.url} target="_blank" rel="noreferrer">Original</a>
            </div>
          </div>
        </header>

        {/* AI Summary with unified design */}
        <section className="ai-component ai-responsive">
          <div className="ai-header">
            <div className="ai-title">
              <span className="ai-icon">✨</span>
              <h3 className="ai-label">AI Summary</h3>
              <div className="ai-mode-indicator">
                Mode: {aiState.mode.toUpperCase()}
              </div>
            </div>
            <div className="ai-controls">
              <div className="ai-mode-buttons">
                <button 
                  className={`ai-mode-btn ${aiState.mode === "tldr" ? "active" : ""}`}
                  onClick={() => runAISummary("tldr")} 
                  disabled={aiState.loading}
                >
                  {aiState.loading && aiState.mode === "tldr" ? "Generating..." : "TL;DR"}
                </button>
                <button 
                  className={`ai-mode-btn ${aiState.mode === "detailed" ? "active" : ""}`}
                  onClick={() => runAISummary("detailed")} 
                  disabled={aiState.loading}
                >
                  {aiState.loading && aiState.mode === "detailed" ? "Generating..." : "Detailed"}
                </button>
                <button 
                  className={`ai-mode-btn ${aiState.mode === "outline" ? "active" : ""}`}
                  onClick={() => runAISummary("outline")} 
                  disabled={aiState.loading}
                >
                  {aiState.loading && aiState.mode === "outline" ? "Generating..." : "Outline"}
                </button>
              </div>
            </div>
          </div>

          <div className="ai-content">
            {aiState.loading && (
              <div className="ai-loading">
                <LoadingSpinner text="Generating AI summary..." variant="compact" />
              </div>
            )}

            {aiState.err && (
              <div className="ai-error">
                <p>Error: {aiState.err}</p>
              </div>
            )}

            {!aiState.err && aiState.summary ? (
              aiState.mode === "outline" ? (
                <div className="ai-summary-card">
                  <div className="ai-summary-title">AI Generated Outline</div>
                  <div className="ai-summary-text">
                    {aiState.summary
                      .split('\n')
                      .filter(line => line.trim())
                      .map((line, i) => (
                        <div key={i} style={{ marginBottom: '8px' }}>
                          {line}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="ai-summary-card">
                  <div className="ai-summary-title">AI Generated Summary</div>
                  <div className="ai-summary-text">{aiState.summary}</div>
                </div>
              )
            ) : (
              <div className="ai-prompt">
                <div className="ai-prompt-content">Choose a mode above to generate an AI-powered summary of this article.</div>
              </div>
            )}
          </div>
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
