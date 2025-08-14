import { useEffect, useState } from "react";

function toYMD(d) {
  if (!d) return new Date().toISOString().slice(0,10);
  const dt = typeof d === "string" ? new Date(d) : new Date(d);
  return dt.toISOString().slice(0,10);
}

export default function JournalEditor({ entry, onSave, onDelete, saving=false }) {
  const [title, setTitle] = useState(entry?.title || "");
  const [date, setDate] = useState(toYMD(entry?.date));
  const [tags, setTags] = useState((entry?.tags || []).join(", "));
  const [body, setBody] = useState(entry?.body || "");
  const isNew = !entry?.id;

  useEffect(() => {
    setTitle(entry?.title || "");
    setDate(toYMD(entry?.date));
    setTags((entry?.tags || []).join(", "));
    setBody(entry?.body || "");
  }, [entry?.id]);

  function handleSave() {
    const payload = {
      title: title.trim(),
      body,
      date,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    onSave(payload);
  }

  return (
    <div className="panel" style={{ padding: 16, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label>Title</label>
        <input
          className="ui-mono"
          placeholder="Untitled journal"
          value={title}
          onChange={e=>setTitle(e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>Date</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>Tags (comma separated)</label>
        <input placeholder="life, reading, class" value={tags} onChange={e=>setTags(e.target.value)} />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label>Body</label>
        <textarea
          className="editor-body"
          placeholder="Write your long-form thoughts here…"
          value={body}
          onChange={e=>setBody(e.target.value)}
          rows={16}
        />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {!isNew && <button className="btn" onClick={onDelete}>Delete</button>}
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : (isNew ? "Create journal" : "Save changes")}
        </button>
      </div>
    </div>
  );
}
