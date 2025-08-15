import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import "../../styles/responsive.css";

export default function Layout({ children, activity, mainTitle="Welcome" }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      {/* responsive header */}
      <div className="header" role="banner">
        <div className="toolbar-responsive">
          <div className="toolbar-left">
            <button className="btn btn-responsive" aria-label="Toggle menu" onClick={() => setNavOpen(true)}>☰</button>
            <div className="ui-mono text-responsive">myjournal</div>
          </div>
        </div>
      </div>

      {/* mobile backdrop */}
      {navOpen && <div className="backdrop" onClick={() => setNavOpen(false)} />}

      <div className="layout-responsive">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        <section className="panel activity fade-in sidebar-responsive" aria-label="Recent activity">
          <h3 className="ui-mono">Activity</h3>
          {activity ?? <p className="prose">Your highlights, notes, and digests will show here.</p>}
        </section>

        <main className="panel main fade-in main-responsive" aria-label="Main content">
          <header className="toolbar-responsive">
            <div className="toolbar-left">
              <h2 className="ui-mono" style={{margin:0}}>{mainTitle}</h2>
            </div>
            <div className="toolbar-right">
              <div className="btn-group-responsive">
                <button className="btn btn-responsive">New Note</button>
                <button className="btn primary btn-responsive">New Journal</button>
              </div>
            </div>
          </header>

          <section className="prose section-responsive">
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
