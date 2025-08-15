import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import * as api from "./digest.api";
import * as articlesApi from "../articles/articles.api";
import LoadingSpinner from "../../components/LoadingSpinner";

function todayUTC() { return new Date().toISOString().slice(0, 10); }
function hostFromUrl(u) { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } }

export default function DailyBrief() {
    const { token } = useAuth();
    const [state, setState] = useState({ loading: true, err: "", digest: null });
    const [length, setLength] = useState("detailed"); // "tldr" | "detailed"

    async function load() {
        setState(s => ({ ...s, loading: true, err: "" }));
        try {
            const { item } = await api.getByDate(token, todayUTC());
            if (item && item.items?.length) {
                setState({ loading: false, err: "", digest: item });
                return;
            }
            // missing or empty → refresh + generate once
            const gen = await api.generate(token, todayUTC(), { limit: 12, refresh: true, length });
            setState({ loading: false, err: "", digest: gen.item });
        } catch (e) {
            setState({ loading: false, err: e.message, digest: null });
        }
    }

    useEffect(() => { if (token) load(); }, [token]);

    async function handleGenerate(opts = {}) {
        setState(s => ({ ...s, loading: true }));
        try {
            const { item } = await api.generate(token, todayUTC(), { limit: 12, length, ...opts });
            setState({ loading: false, err: "", digest: item });
        } catch (e) { setState({ loading: false, err: e.message, digest: null }); }
    }

    async function handleRefreshAndGenerate() {
        setState(s => ({ ...s, loading: true }));
        try {
            await articlesApi.refresh(token, 14, true); // hard refresh feeds
            const { item } = await api.generate(token, todayUTC(), { limit: 12, refresh: false, length });
            setState({ loading: false, err: "", digest: item });
        } catch (e) { setState({ loading: false, err: e.message, digest: null }); }
    }

    if (!token) return <p className="prose">Please <Link to="/login">log in</Link> to see your daily brief.</p>;
    if (state.loading) return <LoadingSpinner text="Loading daily brief..." variant="compact" />;

    const d = state.digest;

    return (
        <div className="fade-in">
            <h2 className="ui-mono" style={{ marginTop: 0 }}>Daily brief — {todayUTC()}</h2>

            <div className="panel" style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <div className="kicker">Controls</div>
                <label className="ui-mono" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    Length:
                    <select value={length} onChange={e => setLength(e.target.value)} className="ui-mono">
                        <option value="detailed">Detailed</option>
                        <option value="tldr">Short TL;DR</option>
                    </select>
                </label>
                <div style={{ flex: 1 }} />
                <button className="btn" onClick={() => handleGenerate({ refresh: false })}>Regenerate</button>
                <button className="btn" onClick={handleRefreshAndGenerate}>Refresh news + regenerate</button>
            </div>

            {!d && (
                <div className="card" style={{ padding: 16 }}>
                    <p className="prose" style={{ margin: "0 0 12px 0" }}>No digest yet today.</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn primary" onClick={() => handleGenerate({ refresh: true })}>Generate digest</button>
                        <button className="btn" onClick={handleRefreshAndGenerate}>Refresh news + generate</button>
                    </div>
                    {state.err && <p style={{ color: "crimson" }}>{state.err}</p>}
                </div>
            )}

            {d && (
                <>
                    {/* AI TL;DR with rainbow glow */}
                    <section className="ai-tldr-section">
                        <div className="ai-tldr-header">
                            <div className="ai-tldr-title">
                                <span className="ai-chip">✨ AI TL;DR</span>
                                {!!d.topics?.length && (
                                    <div className="ai-topics">
                                        {d.topics.map((t, i) => <span key={i} className="topic-chip ui-mono">{t}</span>)}
                                    </div>
                                )}
                            </div>
                            <div className="ai-tldr-meta">
                                <span className="meta-label">Sources:</span>
                                <div className="source-chips">
                                    {(d.sources || []).map((s, i) => <span key={i} className="source-chip ui-mono">{s}</span>)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="ai-tldr-content">
                            {d.tldr ? (
                                <div className="tldr-text">{d.tldr}</div>
                            ) : (
                                <div className="tldr-empty">
                                    <span className="empty-icon">📝</span>
                                    <span className="empty-text">No summary available.</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <Section title="Top stories" items={(d.items || []).filter(i => i.category === "top")} />
                    <Section title="Emerging" items={(d.items || []).filter(i => i.category === "emerging")} />
                    <Section title="Long reads" items={(d.items || []).filter(i => i.category === "long")} />
                </>
            )}
        </div>
    );
}

function Section({ title, items }) {
    if (!items?.length) return null;
    return (
        <section className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 className="ui-mono" style={{ margin: "0 0 8px 0" }}>{title}</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                {items.map((it, idx) => (
                    <li key={idx} className="panel" style={{ padding: 12 }}>
                        <div className="kicker">{it.source || hostFromUrl(it.url)} · ~{it.readingMins} min</div>
                        <h4 className="ui-mono" style={{ margin: "6px 0 8px 0" }}>{it.title}</h4>
                        {it.summary && <p className="prose" style={{ margin: "0 0 8px 0" }}>{it.summary}</p>}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {it.articleId
                                ? <Link className="btn" to={`/articles/${it.articleId}`}>Open saved copy</Link>
                                : <a className="btn" href={it.url} target="_blank" rel="noreferrer">Open original</a>}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

<style jsx>{`
    .ai-tldr-section {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: var(--radius-1);
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
    }

    .ai-tldr-section:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
    }

    .ai-tldr-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border);
        gap: 12px;
    }

    .ai-tldr-title {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .ai-tldr-title .ai-chip {
        background: var(--accent);
        color: var(--accent-contrast);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
    }

    .ai-topics {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .topic-chip {
        background: var(--panel-light);
        color: var(--muted);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        border: 1px solid var(--border-light);
    }

    .ai-tldr-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
    }

    .meta-label {
        font-size: 0.8rem;
        color: var(--muted);
        font-weight: 500;
        white-space: nowrap;
    }

    .source-chips {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }

    .source-chip {
        background: var(--panel-light);
        color: var(--muted);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        border: 1px solid var(--border-light);
        white-space: nowrap;
    }

    .ai-tldr-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .tldr-text {
        font-size: 0.95rem;
        color: var(--text);
        line-height: 1.5;
        margin: 0;
    }

    .tldr-empty {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--panel-light);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-1);
    }

    .empty-icon {
        font-size: 1rem;
        color: var(--muted);
    }

    .empty-text {
        font-size: 0.9rem;
        color: var(--muted);
        font-style: italic;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .ai-tldr-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }

        .ai-tldr-meta {
            align-items: flex-start;
            flex-direction: column;
        }

        .ai-topics, .source-chips {
            gap: 4px;
        }
    }
`}</style>
