import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import * as aiApi from "../ai/ai.api";
import "../../styles/ai.css";
import "../../styles/responsive.css";

function toYMD(d) {
  if (!d) return new Date().toISOString().slice(0,10);
  const dt = typeof d === "string" ? new Date(d) : new Date(d);
  return dt.toISOString().slice(0,10);
}

function formatBullets(text) {
  if (!text) return "";
  
  // Split into lines and ensure each line starts with a bullet
  return text
    .split(/\n+/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      
      // If line doesn't start with a bullet, add one
      if (!/^[•\-\*]\s/.test(trimmed)) {
        return `• ${trimmed}`;
      }
      
      // Normalize existing bullets to • format
      return trimmed.replace(/^[•\-\*]\s*/, "• ");
    })
    .filter(Boolean)
    .join("\n");
}

export default function JournalEditor({ entry, onSave, onDelete, saving=false }) {
  const { token } = useAuth();
  const [title, setTitle] = useState(entry?.title || "");
  const [date, setDate] = useState(toYMD(entry?.date));
  const [tags, setTags] = useState((entry?.tags || []).join(", "));
  const [body, setBody] = useState(entry?.body || "");
  const [mode, setMode] = useState("write"); // "write" or "outline"
  const [aiLoading, setAiLoading] = useState(false);
  const isNew = !entry?.id;

  useEffect(() => {
    setTitle(entry?.title || "");
    setDate(toYMD(entry?.date));
    setTags((entry?.tags || []).join(", "));
    setBody(entry?.body || "");
  }, [entry?.id]);

  async function generateOutline() {
    if (!body.trim() || !token) return;
    
    setAiLoading(true);
    try {
      const { summary } = await aiApi.summarize(token, { text: body, mode: "outline" });
      if (summary) {
        setBody(formatBullets(summary));
      }
    } catch (error) {
      console.error("Failed to generate outline:", error);
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    const payload = {
      title: title.trim(),
      body: mode === "outline" ? formatBullets(body) : body,
      date,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    onSave(payload);
  }

  function toggleMode() {
    if (mode === "write") {
      // Switching to outline mode - format existing text as bullets
      setBody(formatBullets(body));
      setMode("outline");
    } else {
      // Switching to write mode - remove bullets and convert to paragraphs
      setBody(body.replace(/^[•\-\*]\s*/gm, "").replace(/\n+/g, " ").trim());
      setMode("write");
    }
  }

  function handleKeyDown(e) {
    if (mode === "outline") {
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.target;
        const start = target.selectionStart;
        
        // If cursor is at the beginning of a line, add bullet
        if (start === 0 || body[start - 1] === "\n") {
          const newBody = body.slice(0, start) + "• " + body.slice(start);
          setBody(newBody);
          // Set cursor position after the bullet
          setTimeout(() => {
            target.setSelectionRange(start + 2, start + 2);
          }, 0);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = e.target;
        const start = target.selectionStart;
        const lineStart = body.lastIndexOf("\n", start - 1) + 1;
        const currentLine = body.slice(lineStart, start);
        
        // If current line starts with bullet, create new bullet line
        if (/^[•\-\*]\s/.test(currentLine)) {
          const newBody = body.slice(0, start) + "\n• " + body.slice(start);
          setBody(newBody);
          // Set cursor position after the new bullet
          setTimeout(() => {
            target.setSelectionRange(start + 3, start + 3);
          }, 0);
        } else {
          // Regular new line
          const newBody = body.slice(0, start) + "\n" + body.slice(start);
          setBody(newBody);
          setTimeout(() => {
            target.setSelectionRange(start + 1, start + 1);
          }, 0);
        }
      } else if (e.key === "Backspace") {
        const target = e.target;
        const start = target.selectionStart;
        
        // If cursor is right after a bullet, remove the bullet
        if (start >= 2 && body.slice(start - 2, start) === "• ") {
          e.preventDefault();
          const newBody = body.slice(0, start - 2) + body.slice(start);
          setBody(newBody);
          setTimeout(() => {
            target.setSelectionRange(start - 2, start - 2);
          }, 0);
        }
      }
    }
  }

  return (
    <div className="panel form-responsive-single" style={{ padding: 16 }}>
      <div className="form-responsive">
        <div style={{ display: "grid", gap: 6 }}>
          <label>Title</label>
          <input
            className="ui-mono input-responsive"
            placeholder="Untitled journal"
            value={title}
            onChange={e=>setTitle(e.target.value)}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="input-responsive" />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label>Tags (comma separated)</label>
          <input placeholder="life, reading, class" value={tags} onChange={e=>setTags(e.target.value)} className="input-responsive" />
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="toolbar-responsive">
        <div className="toolbar-left">
          <label style={{ margin: 0 }}>Mode:</label>
          <div className="btn-group-responsive">
            <button
              type="button"
              className={`btn btn-responsive ${mode === "write" ? "primary" : ""}`}
              onClick={() => setMode("write")}
              title="Write mode - traditional paragraph writing"
            >
              Write
            </button>
            <button
              type="button"
              className={`btn btn-responsive ${mode === "outline" ? "primary" : ""}`}
              onClick={() => setMode("outline")}
              title="Outline mode - bullet point organization"
            >
              Outline
            </button>
          </div>
        </div>
        
        {mode === "outline" && (
          <div className="toolbar-right">
            <button
              type="button"
              className="ai-generate-btn"
              onClick={generateOutline}
              disabled={aiLoading || !body.trim() || !token}
              title="Generate AI-powered outline from your text"
            >
              {aiLoading ? "Generating..." : "✨ AI Outline"}
            </button>
          </div>
        )}
      </div>

      {mode === "outline" && (
        <div className="outline-tips">
          <strong>Outline Mode Tips:</strong>
          <br />• Press <kbd>Tab</kbd> at line start to add bullets
          <br />• Press <kbd>Enter</kbd> to create new bullet points
          <br />• Press <kbd>Backspace</kbd> after • to remove bullets
          <br />• Use AI Outline to convert your text to bullet points
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        <label>{mode === "outline" ? "Outline" : "Body"}</label>
        {mode === "outline" ? (
          <div style={{ position: "relative" }}>
            <textarea
              className="editor-body outline-mode"
              placeholder="• Start with a bullet point&#10;• Add more points as needed&#10;• Use AI to generate from your text"
              value={body}
              onChange={e=>setBody(e.target.value)}
              rows={16}
              style={{
                paddingLeft: "1.2em"
              }}
              onKeyDown={handleKeyDown}
            />
            {/* Bullet indicators */}
            <div style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              pointerEvents: "none",
              color: "var(--muted)",
              fontSize: "14px",
              lineHeight: "1.6"
            }}>
              {body.split('\n').map((_, i) => (
                <div key={i} style={{ height: "1.6em" }}>•</div>
              ))}
            </div>
          </div>
        ) : (
          <textarea
            className="editor-body"
            placeholder="Write your long-form thoughts here…"
            value={body}
            onChange={e=>setBody(e.target.value)}
            rows={16}
          />
        )}
      </div>

      <div className="toolbar-responsive">
        <div className="toolbar-left"></div>
        <div className="toolbar-right">
          <div className="btn-group-responsive">
            {!isNew && <button className="btn btn-responsive" onClick={onDelete}>Delete</button>}
            <button className="btn primary btn-responsive" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : (isNew ? "Create journal" : "Save changes")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
