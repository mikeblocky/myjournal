import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../features/notes/notes.api";
import LoadingSpinner from "../components/LoadingSpinner";
import { today } from "../lib/date";
import "../styles/ai.css";
import "../styles/responsive.css";

export default function NotesPage(){
  const { token } = useAuth();
  const [date, setDate] = useState(today());
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({ title:"", body:"" });
  const [saving, setSaving] = useState(false);

  const [daily, setDaily] = useState({ loading: true, item: null, nothingToDo: false, err: "" });

  // Sync state
  const [syncOptions, setSyncOptions] = useState({ startTime: "09:00", endTime: "10:00", allDay: false, location: "", color: "" });
  const [syncing, setSyncing] = useState(false);

  async function loadNotes(){
    if(!token) return;
    setLoading(true); setErr("");
    try{
      const { items } = await api.list(token, { date, limit: 200 });
      setList(items);
    }catch(e){ setErr(e.message); }
    finally{ setLoading(false); }
  }

  async function loadDaily(){
    if(!token) return;
    setDaily(s => ({ ...s, loading: true, err: "" }));
    try{
      const { item } = await api.getDaily(token, date);
      setDaily({ loading:false, item, nothingToDo: !item || (item.bullets||[]).length===0, err:"" });
    }catch(e){ setDaily({ loading:false, item:null, nothingToDo:true, err:e.message }); }
  }

  useEffect(()=>{ if(token){ loadNotes(); loadDaily(); } }, [token, date]);

  async function onCreate(e){
    e.preventDefault();
    if(!form.title && !form.body) return;
    setSaving(true);
    try{
      await api.create(token, { title: form.title, body: form.body, date });
      setForm({ title:"", body:"" });
      await loadNotes();
      // reset daily summary (user changed notes)
      setDaily(d=>({ ...d, item:null, nothingToDo:false }));
    }finally{ setSaving(false); }
  }

  async function toggleDone(n){
    try{
      await api.update(token, n.id, { done: !n.done });
      setList(ls => ls.map(x => x.id === n.id ? { ...x, done: !x.done } : x));
    }catch(e){ /* ignore */ }
  }

  async function handleGenerateDaily(){
    setDaily({ loading:true, item:null, nothingToDo:false, err:"" });
    try{
      const res = await api.generateDaily(token, date);
      setDaily({ loading:false, item: res.item, nothingToDo: res.nothingToDo || (res.item?.bullets?.length===0), err:"" });
    }catch(e){
      setDaily({ loading:false, item:null, nothingToDo:true, err:e.message });
    }
  }

  // Sync individual note to calendar
  async function syncNoteToCalendar(noteId) {
    setSyncing(true);
    try {
      const result = await api.syncToCalendar(token, { 
        noteId, 
        ...syncOptions 
      });
      alert(`Note synced to calendar successfully!`);
    } catch (e) {
      alert(`Failed to sync note: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  // Sync all notes for the date to calendar
  async function syncAllNotesToCalendar() {
    if (list.length === 0) {
      alert("No notes to sync for this date");
      return;
    }

    setSyncing(true);
    try {
      const result = await api.syncDateToCalendar(token, date, syncOptions);
      alert(`Synced ${result.items.length} notes to calendar for ${date}!`);
    } catch (e) {
      alert(`Failed to sync notes: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="fade-in page container">
      <div className="j-toolbar toolbar-responsive">
        <div className="toolbar-left">
          <div className="kicker">Notes for {date}</div>
        </div>
        <div className="toolbar-right">
          <div className="search-responsive">
            <input 
              type="date" 
              value={date} 
              onChange={e=>setDate(e.target.value)}
              className="input-responsive"
            />
            <button className="btn btn-responsive" onClick={loadNotes}>Reload</button>
          </div>
        </div>
      </div>

      {/* AI daily summary with unified design */}
      <section className="ai-component ai-responsive">
        <div className="ai-header">
          <div className="ai-title">
            <span className="ai-icon">📝</span>
            <h3 className="ai-label">Daily AI Notes</h3>
            <div className="ai-mode-indicator">{date}</div>
          </div>
          <div className="ai-controls">
            <button 
              className="ai-generate-btn" 
              onClick={handleGenerateDaily} 
              disabled={daily.loading}
            >
              {daily.loading ? "Summarizing…" : "Generate Summary"}
            </button>
          </div>
        </div>

        <div className="ai-content">
          {daily.err && (
            <div className="ai-error">
              <p>Error: {daily.err}</p>
            </div>
          )}

          {!daily.loading && daily.nothingToDo && (list.length === 0) && (
            <div className="ai-prompt">
              <div className="ai-prompt-content">You have no notes for today.</div>
            </div>
          )}

          {!daily.loading && !daily.nothingToDo && daily.item?.bullets?.length > 0 && (
            <div className="ai-summary-card">
              <div className="ai-summary-title">Generated Summary</div>
              <div className="ai-summary-text">
                {daily.item.bullets.map((b,i)=>(
                  <div key={i} style={{ marginBottom: '8px' }}>
                    • {b}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!daily.loading && !daily.item && list.length > 0 && (
            <div className="ai-prompt">
              <div className="ai-prompt-content">Click "Generate Summary" to create an AI-powered summary of your notes.</div>
            </div>
          )}

          {daily.loading && (
            <div className="ai-loading">
              <LoadingSpinner text="Analyzing your notes and generating insights..." variant="compact" />
            </div>
          )}
        </div>
      </section>

      {/* Calendar Sync Options */}
      {list.length > 0 && (
        <section className="sync-options-card">
          <div className="sync-options-header">
            <div className="sync-options-title">
              <span className="sync-icon">📅</span>
              <span className="sync-title">Calendar sync</span>
            </div>
            <div className="sync-options-controls">
              <button 
                className="btn primary" 
                onClick={syncAllNotesToCalendar} 
                disabled={syncing}
              >
                {syncing ? "Syncing..." : `Sync ${list.length} notes to calendar`}
              </button>
            </div>
          </div>
          
          <div className="sync-options-grid">
            <div className="sync-option-group">
              <label className="sync-label">
                <span className="label-text">Start Time</span>
                <input 
                  type="time" 
                  value={syncOptions.startTime} 
                  onChange={e => setSyncOptions(opt => ({ ...opt, startTime: e.target.value }))}
                  disabled={syncOptions.allDay}
                  className="sync-input"
                />
              </label>
            </div>
            
            <div className="sync-option-group">
              <label className="sync-label">
                <span className="label-text">End Time</span>
                <input 
                  type="time" 
                  value={syncOptions.endTime} 
                  onChange={e => setSyncOptions(opt => ({ ...opt, endTime: e.target.value }))}
                  disabled={syncOptions.allDay}
                  className="sync-input"
                />
              </label>
            </div>
            
            <div className="sync-option-group">
              <label className="sync-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={syncOptions.allDay} 
                  onChange={e => setSyncOptions(opt => ({ ...opt, allDay: e.target.checked }))}
                  className="sync-checkbox"
                />
                <span className="checkbox-text">All day event</span>
              </label>
            </div>
            
            <div className="sync-option-group">
              <label className="sync-label">
                <span className="label-text">Location</span>
                <input 
                  type="text" 
                  placeholder="Optional location"
                  value={syncOptions.location} 
                  onChange={e => setSyncOptions(opt => ({ ...opt, location: e.target.value }))}
                  className="sync-input"
                />
              </label>
            </div>
            
            <div className="sync-option-group">
              <label className="sync-label">
                <span className="label-text">Color</span>
                <input 
                  type="color" 
                  value={syncOptions.color} 
                  onChange={e => setSyncOptions(opt => ({ ...opt, color: e.target.value }))}
                  className="sync-color-input"
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Add note */}
      <form onSubmit={onCreate} className="add-note-card">
        <div className="add-note-header">
          <span className="add-note-icon"></span>
          <span className="add-note-title">Add new note</span>
        </div>
        
        <div className="add-note-form">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              placeholder="Quick note title"
              value={form.title}
              onChange={e=>setForm(f=>({ ...f, title: e.target.value }))}
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Details</label>
            <textarea
              className="form-textarea"
              placeholder="Write a few lines…"
              rows={5}
              value={form.body}
              onChange={e=>setForm(f=>({ ...f, body: e.target.value }))}
            />
          </div>
          
          <div className="form-actions">
            <button className="btn primary" disabled={saving}>
              {saving ? "Saving…" : "Add Note"}
            </button>
          </div>
        </div>
      </form>

      {/* List notes - Redesigned */}
      <section className="card" style={{ padding:16 }}>
        {err && <p className="prose" style={{ color:"crimson" }}>{err}</p>}
        {loading ? <LoadingSpinner text="Loading notes..." variant="compact" /> : (
          list.length === 0 ? <p className="prose" style={{ margin:0 }}>No notes for {date}.</p> : (
            <div className="notes-grid" style={{ display:"grid", gap:12 }}>
              {list.map(n=>(
                <div key={n.id} className={`note-card ${n.done ? 'completed' : ''}`}>
                  <div className="note-header">
                    <div className="note-checkbox">
                      <input 
                        type="checkbox" 
                        checked={n.done} 
                        onChange={()=>toggleDone(n)}
                        className="note-checkbox-input"
                      />
                    </div>
                    <div className="note-content">
                      <div className="note-title">
                        {n.title || "(untitled)"}
                      </div>
                      {n.body && (
                        <div className="note-body">
                          {n.body}
                        </div>
                      )}
                    </div>
                    <div className="note-meta">
                      <div className="note-tags">
                        {n.pinned && <span className="note-tag pinned">📌 Pinned</span>}
                        <span className="note-tag date">{n.date}</span>
                      </div>
                      <button 
                        className="note-sync-btn" 
                        onClick={() => syncNoteToCalendar(n.id)}
                        disabled={syncing}
                        title="Sync to calendar"
                      >
                        📅
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      <style jsx>{`
        .notes-grid {
          display: grid;
          gap: 12px;
        }
        
        .note-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 16px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .note-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        .note-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: flex-start;
        }
        
        .note-checkbox {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-top: 2px;
        }
        
        .note-checkbox-input {
          width: 18px;
          height: 18px;
          accent-color: var(--accent);
          cursor: pointer;
        }
        
        .note-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        
        .note-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text);
          line-height: 1.3;
          word-break: break-word;
        }
        
        .note-body {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.4;
          word-break: break-word;
        }
        
        .note-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
          min-width: 0;
        }
        
        .note-tags {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }
        
        .note-tag {
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--accent);
          color: var(--accent-contrast);
          white-space: nowrap;
        }
        
        .note-tag.pinned {
          background: var(--accent);
          color: var(--accent-contrast);
        }
        
        .note-tag.date {
          background: var(--panel);
          color: var(--muted);
          border: 1px solid var(--border);
          font-family: var(--font-mono);
        }
        
        .note-sync-btn {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 6px 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          color: var(--muted);
        }
        
        .note-sync-btn:hover {
          background: var(--accent);
          color: var(--accent-contrast);
          border-color: var(--accent);
        }
        
        .note-sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Completed note styling */
        .note-card.completed .note-title {
          text-decoration: line-through;
          opacity: 0.6;
        }
        
        .note-card.completed .note-body {
          opacity: 0.6;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .note-header {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .note-checkbox {
            justify-self: flex-start;
          }
          
          .note-meta {
            align-items: flex-start;
            flex-direction: row;
            justify-content: space-between;
          }
          
          .note-tags {
            flex-direction: row;
            align-items: center;
          }
        }

        /* New styles for AI summary card */
        .ai-summary-section {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 16px;
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
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .ai-summary-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-summary-title .ai-chip {
          background: var(--accent);
          color: var(--accent-contrast);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .ai-summary-title .ai-date {
          font-size: 1rem;
          color: var(--text);
          font-weight: 500;
        }

        .ai-summary-controls {
          display: flex;
          gap: 8px;
        }

        .ai-summary-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ai-error-card, .ai-empty-card, .ai-prompt-card, .ai-loading-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .ai-error-card:hover, .ai-empty-card:hover, .ai-prompt-card:hover, .ai-loading-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .ai-error-card .error-header, .ai-empty-card .empty-header, .ai-prompt-card .prompt-header, .ai-loading-card .loading-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .ai-error-card .error-icon, .ai-empty-card .empty-icon, .ai-prompt-card .prompt-icon, .ai-loading-card .loading-spinner {
          font-size: 1.2rem;
          color: var(--accent);
        }

        .ai-error-card .error-title, .ai-empty-card .empty-title, .ai-prompt-card .prompt-title, .ai-loading-card .loading-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text);
        }

        .ai-error-card .error-content, .ai-empty-card .empty-content, .ai-prompt-card .prompt-content, .ai-loading-card .loading-content {
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
          border-bottom: 1px solid var(--border-light);
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

        /* New styles for sync options card */
        .sync-options-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .sync-options-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .sync-options-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .sync-options-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sync-options-title .sync-icon {
          font-size: 1rem;
          color: var(--accent);
        }

        .sync-options-title .sync-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text);
        }

        .sync-options-controls {
          display: flex;
          gap: 8px;
        }

        .sync-options-grid {
          display: grid;
          gap: 12px;
        }

        .sync-option-group {
          display: flex;
          flex-direction: column;
        }

        .sync-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sync-label .label-text {
          font-size: 0.9rem;
          color: var(--muted);
          font-weight: 500;
        }

        .sync-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          background: var(--input);
          color: var(--text);
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .sync-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .sync-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .sync-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .sync-checkbox-label .checkbox-text {
          font-size: 0.9rem;
          color: var(--text);
          font-weight: 500;
        }

        .sync-color-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          background: var(--input);
          color: var(--text);
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .sync-color-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        /* New styles for add note card */
        .add-note-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .add-note-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .add-note-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .add-note-header .add-note-icon {
          font-size: 1.2rem;
          color: var(--accent);
        }

        .add-note-header .add-note-title {
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--text);
        }

        .add-note-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 0.9rem;
          color: var(--muted);
          font-weight: 500;
          margin-bottom: 4px;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          background: var(--input);
          color: var(--text);
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
        }

        /* New styles for toolbar card */
        .toolbar-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          padding: 12px 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .toolbar-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .toolbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toolbar-icon {
          font-size: 1.5rem;
          color: var(--accent);
        }

        .toolbar-title {
          font-weight: 600;
          font-size: 1.2rem;
          color: var(--text);
        }

        .date-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-label {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .date-text {
          font-size: 0.9rem;
          color: var(--muted);
          font-weight: 500;
        }

        .date-input {
          width: 140px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-1);
          background: var(--input);
          color: var(--text);
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .date-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-light);
        }

        .toolbar-right {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          font-size: 0.9rem;
          color: var(--muted);
        }

        .btn-text {
          font-size: 0.9rem;
          color: var(--text);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
