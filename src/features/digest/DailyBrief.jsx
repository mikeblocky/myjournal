import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import * as api from "./digest.api";
import * as articlesApi from "../articles/articles.api";
import { useDailyDigest } from "../../hooks/useOptimizedFetch";
import LoadingSpinner from "../../components/LoadingSpinner";
import "./digest.css";

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
        <div className="fade-in">
            <h2 className="ui-mono" style={{ marginTop: 0 }}>Daily brief — {todayUTC()}</h2>

            <div className="j-toolbar" style={{ marginBottom: 12 }}>
                <div className="kicker">Controls</div>
                <label className="ui-mono" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    Length:
                    <select value={length} onChange={e => setLength(e.target.value)} className="ui-mono">
                        <option value="detailed">Detailed</option>
                        <option value="tldr">Short TL;DR</option>
                    </select>
                </label>
                
                {/* Performance indicators */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                
                <div className="spacer" />
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
                                <span className="ai-chip">AI TL;DR</span>
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
                                    <span className="empty-icon">Note</span>
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
