import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import * as api from "./digest.api";
import * as articlesApi from "../articles/articles.api";

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
    if (state.loading) return <p className="prose">Loading…</p>;

    const d = state.digest;

    return (
        <div className="fade-in">
            <h2 className="ui-mono" style={{ marginTop: 0 }}>Daily Brief — {todayUTC()}</h2>

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
                    <section className="ai-card" style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            <span className="ai-chip">✨ AI TL;DR</span>
                            {!!d.topics?.length && (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {d.topics.map((t, i) => <span key={i} className="chip ui-mono" style={{ fontSize: 12 }}>{t}</span>)}
                                </div>
                            )}
                            <div style={{ flex: 1 }} />
                            <span className="kicker">Sources:</span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {(d.sources || []).map((s, i) => <span key={i} className="chip ui-mono" style={{ fontSize: 11 }}>{s}</span>)}
                            </div>
                        </div>
                        <p className="prose" style={{ margin: 0 }}>{d.tldr || "No summary."}</p>
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
