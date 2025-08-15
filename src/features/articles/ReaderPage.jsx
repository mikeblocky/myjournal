import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as api from "./articles.api";
import * as ai from "../ai/ai.api";
import { sanitizeArticle } from "../../lib/sanitize";
import LoadingSpinner from "../../components/LoadingSpinner";
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
  if (state.loading) return <LoadingSpinner text="Loading article..." variant="compact" />;
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
        <section className="ai-summary-section">
          <div className="ai-summary-header">
            <div className="ai-summary-title">
              <span className="ai-chip">✨ AI Summary</span>
              <div className="ai-mode-indicator">
                Mode: {aiState.mode.toUpperCase()}
              </div>
            </div>
            <div className="ai-summary-controls">
              <div className="mode-buttons">
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
          </div>

          <div className="ai-summary-content">
            {aiState.err && (
              <div className="ai-error-card">
                <div className="error-header">
                  <span className="error-icon">⚠️</span>
                  <span className="error-title">Error</span>
                </div>
                <div className="error-content">{aiState.err}</div>
              </div>
            )}

            {!aiState.err && aiState.summary ? (
              aiState.mode === "outline" ? (
                <div className="ai-summary-card">
                  <div className="summary-header">
                    <span className="summary-icon">📋</span>
                    <span className="summary-title">AI Generated Outline</span>
                  </div>
                  <div className="summary-content">
                    <ul className="summary-bullets">
                      {aiState.summary
                        .split(/\n|(?=•\s)/) // Split on newlines OR before bullet markers
                        .map((line, i) => {
                          const trimmed = line.trim();
                          // Skip empty lines
                          if (!trimmed) return null;
                          
                          // Check if this line starts with a bullet marker
                          const bulletMatch = trimmed.match(/^[•\-\*]\s*(.+)/);
                          if (bulletMatch) {
                            return (
                              <li key={i} className="summary-bullet">
                                <span className="bullet-marker">•</span>
                                <span className="bullet-text">{bulletMatch[1].trim()}</span>
                              </li>
                            );
                          }
                          
                          // If no bullet marker, treat as regular text (fallback)
                          return (
                            <li key={i} className="summary-bullet">
                              <span className="bullet-marker">•</span>
                              <span className="bullet-text">{trimmed}</span>
                            </li>
                          );
                        })
                        .filter(Boolean) // Remove null entries
                      }
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="ai-summary-card">
                  <div className="summary-header">
                    <span className="summary-icon">📝</span>
                    <span className="summary-title">AI Generated Summary</span>
                  </div>
                  <div className="summary-content">
                    <div className="summary-text">{aiState.summary}</div>
                  </div>
                </div>
              )
            ) : (
              <div className="ai-prompt-card">
                <div className="prompt-header">
                  <span className="prompt-icon">💡</span>
                  <span className="prompt-title">Ready to Summarize</span>
                </div>
                <div className="prompt-content">Choose a mode above to generate an AI-powered summary of this article.</div>
              </div>
            )}

            {aiState.loading && (
              <div className="ai-loading-card">
                <div className="loading-header">
                  <div className="loading-spinner"></div>
                  <span className="loading-title">Generating Summary</span>
                </div>
                <div className="loading-content">Analyzing article content and generating insights...</div>
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
