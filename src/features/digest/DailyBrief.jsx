import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import * as api from "./digest.api";
import * as articlesApi from "../articles/articles.api";
import { useDailyDigest } from "../../hooks/useOptimizedFetch";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./digest.css";
import "../../styles/ai.css";
import "../../styles/responsive.css";

function todayUTC() { return new Date().toISOString().slice(0, 10); }
function hostFromUrl(u) { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } }

export default function DailyBrief() {
    const { token } = useAuth();
    const [length, setLength] = useState("detailed"); // "tldr" | "detailed"
    
    // Use optimized fetching hook
    const { 
        data: digestData, 
        loading, 
        error, 
        refresh, 
        isStale 
    } = useDailyDigest(token, todayUTC(), {
        digestLength: length,
        immediate: !!token,
        enableBackgroundRefresh: true,
        backgroundRefreshInterval: 60000, // 1 minute
        staleTime: 300000 // 5 minutes
    });

    // Smart loading state - show cached data immediately if available
    const [state, setState] = useState({ 
        loading: !digestData, 
        err: error, 
        digest: digestData?.item || null 
    });

    // Update state when data changes
    useEffect(() => {
        if (digestData?.item) {
            setState({ loading: false, err: null, digest: digestData.item });
        } else if (error) {
            setState({ loading: false, err: error, digest: null });
        }
    }, [digestData, error]);

    // Auto-generate digest if none exists
    useEffect(() => {
        if (token && !loading && !state.digest && !state.err) {
            handleGenerate({ refresh: true });
        }
    }, [token, loading, state.digest, state.err]);

    const handleGenerate = useCallback(async (opts = {}) => {
        setState(s => ({ ...s, loading: true }));
        try {
            const { item } = await api.generate(token, todayUTC(), { limit: 12, length, ...opts });
            setState({ loading: false, err: "", digest: item });
            
            // Refresh the cached data
            refresh();
        } catch (e) { 
            setState({ loading: false, err: e.message, digest: null }); 
        }
    }, [token, length, refresh]);

    const handleRefreshAndGenerate = useCallback(async () => {
        setState(s => ({ ...s, loading: true }));
        try {
            // Use optimized refresh with progress indication
            const refreshPromise = articlesApi.refresh(token, 14, true);
            
            // Show refresh progress
            setState(s => ({ ...s, loading: true, err: "Refreshing news sources..." }));
            
            await refreshPromise;
            
            const { item } = await api.generate(token, todayUTC(), { limit: 12, refresh: false, length });
            setState({ loading: false, err: "", digest: item });
            
            // Refresh the cached data
            refresh();
        } catch (e) { 
            setState({ loading: false, err: e.message, digest: null }); 
        }
    }, [token, length, refresh]);

    if (!token) return <p className="prose">Please <Link to="/login">log in</Link> to see your daily brief.</p>;
    if (state.loading) return <LoadingSpinner text="Loading daily brief..." variant="compact" />;

    const d = state.digest;

    return (
        <div className="fade-in page container">
            <h2 className="ui-mono text-responsive-xl" style={{ marginTop: 0 }}>Daily brief — {todayUTC()}</h2>

            <div className="j-toolbar toolbar-responsive" style={{ marginBottom: 12 }}>
                <div className="toolbar-left">
                    <div className="kicker">Controls</div>
                    <div className="search-responsive">
                        <label className="ui-mono" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                            Length:
                            <select value={length} onChange={e => setLength(e.target.value)} className="ui-mono input-responsive">
                                <option value="detailed">Detailed</option>
                                <option value="detailed">Short TL;DR</option>
                            </select>
                        </label>
                    </div>
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
                        {state.digest && (
                            <span className="kicker" style={{ 
                                color: "#10b981", 
                                padding: "4px 8px", 
                                background: "#d1fae5", 
                                borderRadius: "var(--radius-1)",
                                border: "1px solid #34d399"
                            }}>
                                Fresh
                            </span>
                        )}
                    </div>
                    
                    <div className="btn-group-responsive">
                        <button className="ai-generate-btn" onClick={() => handleGenerate({ refresh: false })}>Regenerate</button>
                        <button className="ai-generate-btn" onClick={handleRefreshAndGenerate}>Refresh news + regenerate</button>
                    </div>
                </div>
            </div>

            {!d && (
                <div className="card" style={{ padding: 16 }}>
                    <p className="prose" style={{ margin: "0 0 12px 0" }}>No digest yet today.</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="ai-generate-btn" onClick={() => handleGenerate({ refresh: true })}>Generate digest</button>
                        <button className="ai-generate-btn" onClick={handleRefreshAndGenerate}>Refresh news + generate</button>
                    </div>
                    {state.err && <p style={{ color: "crimson" }}>{state.err}</p>}
                </div>
            )}

            {d && (
                <>
                    {/* AI TL;DR with unified design */}
                    <section className="ai-component ai-responsive">
                        <div className="ai-header">
                            <div className="ai-title">
                                <span className="ai-icon">📰</span>
                                <h3 className="ai-label">AI TL;DR</h3>
                                {!!d.topics?.length && (
                                    <div className="ai-mode-indicator">
                                        {d.topics.slice(0, 3).join(", ")}
                                    </div>
                                )}
                            </div>
                            <div className="ai-controls">
                                <div className="ai-status">
                                    <span className="ai-status-dot"></span>
                                    <span>AI Generated</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="ai-content">
                            {d.tldr ? (
                                <div className="ai-summary-card">
                                    <div className="ai-summary-title">Daily Brief Summary</div>
                                    <div className="ai-summary-text">{d.tldr}</div>
                                </div>
                            ) : (
                                <div className="ai-prompt">
                                    <div className="ai-prompt-content">No summary available.</div>
                                </div>
                            )}
                            
                            {!!d.sources?.length && (
                                <div className="ai-summary-card">
                                    <div className="ai-summary-title">Sources</div>
                                    <div className="ai-summary-text">
                                        {d.sources.map((s, i) => (
                                            <div key={i} style={{ marginBottom: '4px' }}>
                                                • {s}
                                            </div>
                                        ))}
                                    </div>
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
