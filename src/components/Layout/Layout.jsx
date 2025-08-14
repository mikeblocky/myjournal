import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";

export default function Layout({ children, activity, mainTitle="Welcome" }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      {/* mobile header */}
      <div className="header" role="banner">
        <button className="btn" aria-label="Toggle menu" onClick={() => setNavOpen(true)}>☰</button>
        <div className="ui-mono">myjournal</div>
      </div>

      {/* mobile backdrop */}
      {navOpen && <div className="backdrop" onClick={() => setNavOpen(false)} />}

      <div className="app">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        <section className="panel activity fade-in" aria-label="Recent activity">
          <h3 className="ui-mono">Activity</h3>
          {activity ?? <p className="prose">Your highlights, notes, and digests will show here.</p>}
        </section>

        <main className="panel main fade-in" aria-label="Main content">
          <header style={{display:"flex",alignItems:"center",justifyContent:"space-between", gap:12}}>
            <h2 className="ui-mono" style={{margin:0}}>{mainTitle}</h2>
            <div style={{display:"flex",gap:8}}>
              <button className="btn">New Note</button>
              <button className="btn primary">New Journal</button>
            </div>
          </header>

          <section className="prose" style={{marginTop:16}}>
            {children ?? (
              <>
                <p>Write softly. Read widely. Keep what matters.</p>
                <blockquote>Little notes become long memory.</blockquote>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
