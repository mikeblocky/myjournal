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
                      {aiState.summary.split("\n").map((line, i) => (
                        <li key={i} className="summary-bullet">
                          <span className="bullet-marker">•</span>
                          <span className="bullet-text">{line.replace(/^[-•\s]+/, "")}</span>
                        </li>
                      ))}
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

<style jsx>{`
  .ai-summary-section {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-1);
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }

  .ai-summary-section:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .ai-summary-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    gap: 12px;
  }

  .ai-summary-title {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .ai-summary-title .ai-chip {
    background: var(--accent);
    color: var(--accent-contrast);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .ai-mode-indicator {
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 500;
    padding: 2px 6px;
    background: var(--panel-light);
    border: 1px solid var(--border-light);
    border-radius: 4px;
  }

  .ai-summary-controls {
    display: flex;
    gap: 8px;
  }

  .mode-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .ai-summary-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ai-error-card, .ai-prompt-card, .ai-loading-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-1);
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }

  .ai-error-card:hover, .ai-prompt-card:hover, .ai-loading-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .ai-error-card .error-header, .ai-prompt-card .prompt-header, .ai-loading-card .loading-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .ai-error-card .error-icon, .ai-prompt-card .prompt-icon, .ai-loading-card .loading-spinner {
    font-size: 1.2rem;
    color: var(--accent);
  }

  .ai-error-card .error-title, .ai-prompt-card .prompt-title, .ai-loading-card .loading-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
  }

  .ai-error-card .error-content, .ai-prompt-card .prompt-content, .ai-loading-card .loading-content {
    font-size: 0.9rem;
    color: var(--muted);
    line-height: 1.4;
  }

  .ai-summary-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-1);
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }

  .ai-summary-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .summary-header .summary-icon {
    font-size: 1rem;
    color: var(--accent);
  }

  .summary-header .summary-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
  }

  .summary-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .summary-text {
    font-size: 0.95rem;
    color: var(--text);
    line-height: 1.5;
    margin: 0;
  }

  .summary-bullets {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .summary-bullet {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
  }

  .summary-bullet .bullet-marker {
    font-size: 0.8rem;
    color: var(--accent);
  }

  .summary-bullet .bullet-text {
    font-size: 0.9rem;
    color: var(--text);
    line-height: 1.4;
  }

  .ai-loading-card .loading-spinner {
    border: 4px solid var(--border);
    border-top: 4px solid var(--accent);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .ai-summary-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .ai-summary-controls {
      align-items: flex-start;
      flex-direction: column;
    }

    .mode-buttons {
      gap: 4px;
    }
  }
`}</style>
