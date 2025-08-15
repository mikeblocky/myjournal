function isOutlineContent(text) {
  if (!text) return false;
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return false;
  
  // Check if most lines start with bullet points
  const bulletLines = lines.filter(line => /^[•\-\*]\s/.test(line.trim()));
  return bulletLines.length >= lines.length * 0.7; // 70% threshold
}

export default function JournalList({ items, selectedId, onSelect, onNew, onSearch, q, setQ }) {
  return (
    <div className="panel" style={{ padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Search title/body…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={onSearch}>Search</button>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={onNew}>New Journal</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {items.map(j => {
          const active = selectedId === j.id;
          const isOutline = isOutlineContent(j.body);
          const snippet = (j.body || "").replace(/\s+/g, " ").slice(0, 120);
          return (
            <li key={j.id}>
              <button
                className="btn"
                style={{
                  width: "100%", textAlign: "left",
                  background: active ? "color-mix(in oklab, var(--panel) 80%, var(--accent) 20%)" : "var(--panel)"
                }}
                onClick={() => onSelect(j)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="ui-mono" style={{ fontWeight: 600 }}>{j.title || "Untitled"}</div>
                  {isOutline && (
                    <span className="chip" style={{ 
                      fontSize: "0.7em", 
                      backgroundColor: "var(--accent)", 
                      color: "white",
                      padding: "2px 6px"
                    }}>
                      📋
                    </span>
                  )}
                </div>
                <div className="ui-mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date(j.date).toISOString().slice(0,10)} {j.tags?.length ? "· " + j.tags.join(", ") : ""}
                </div>
                {snippet && (
                  <div className="prose" style={{ marginTop: 6 }}>
                    {isOutline ? (
                      <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                        {j.body.split('\n').filter(line => line.trim()).length} bullet points
                      </span>
                    ) : (
                      snippet + (j.body.length > 120 ? "…" : "")
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
        {items.length === 0 && <p className="prose" style={{ margin: 8 }}>No journals yet.</p>}
      </ul>
    </div>
  );
}
