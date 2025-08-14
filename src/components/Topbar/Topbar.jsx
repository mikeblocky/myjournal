import "./Topbar.css";
import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(5); // how many links to show inline (desktop only)

  // Width tiers → how many nav items we show on the bar (only applies ≥900px)
  useEffect(() => {
    function recompute() {
      const w = window.innerWidth || 1200;
      // tweak tiers to taste; higher width → more inline links
      const count =
        w >= 1240 ? 5 :
        w >= 1100 ? 4 :
        w >= 980  ? 3 :
        w >= 860  ? 2 :
        w >= 740  ? 1 : 0;
      setVisibleCount(count);
    }
    recompute();
    window.addEventListener("resize", recompute, { passive: true });
    return () => window.removeEventListener("resize", recompute);
  }, []);

  function onSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    nav(`/articles?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  const linkStyle = ({ isActive }) => ({
    padding: "8px 10px",
    borderRadius: "8px",
    color: "var(--text)",
    background: isActive ? "color-mix(in oklab, var(--panel) 80%, var(--accent) 20%)" : "transparent",
    textDecoration: "none"
  });

  const links = [
    { to: "/journal",  label: "Journal" },
    { to: "/notes",    label: "Notes" },
    { to: "/calendar", label: "Calendar" },
    { to: "/articles", label: "Articles" },
    { to: "/digest",   label: "Daily brief" }, // lowercase b
  ];

  const inlineLinks = links.slice(0, visibleCount);

  return (
    <>
      <header className="topbar" role="banner">
        <div className="brand">
          <Link to="/" className="logo" aria-label="Home">✸</Link>
          <Link to="/" className="title ui-mono">myjournal</Link>
        </div>

        {/* Desktop / tablet (hidden under 900px via CSS) */}
        <nav className="nav-inline" aria-label="Primary">
          {inlineLinks.map(l => (
            <NavLink key={l.to} to={l.to} style={linkStyle}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="actions">
          {/* Desktop search (hidden under 900px via CSS) */}
          <form onSubmit={onSearch} className="search" role="search">
            <input
              aria-label="Search articles"
              placeholder="Search…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </form>

          {/* Desktop write (hidden under 900px via CSS) */}
          {user && (
            <Link className="btn write-btn" to="/journal/new" aria-label="Write a journal">
              Write
            </Link>
          )}

          {/* Theme toggle (always visible) */}
          <button className="btn" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? "☀︎" : "☾"}
          </button>

          {/* Username on bar (always visible if logged in), logout only on desktop */}
          {user ? (
            <div className="account">
              <span className="ui-mono id">{user.email.split("@")[0]}</span>
              <button className="btn logout-btn" onClick={logout}>Log out</button>
            </div>
          ) : (
            // Log in only on desktop; on mobile it lives in the sheet
            <Link className="btn login-btn" to="/login">Log in</Link>
          )}

          {/* Hamburger (only shows under 900px via CSS) */}
          <button
            className="menu-btn"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="main-menu"
            onClick={() => setOpen(v => !v)}
          >☰</button>
        </div>
      </header>

      {/* Mobile-only floating Write button */}
      {user && (
        <Link to="/journal/new" className="fab btn primary" aria-label="Write a journal">
          Write
        </Link>
      )}

      {/* Mobile sheet */}
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <div
        id="main-menu"
        className={`menu-sheet ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <form onSubmit={onSearch} className="menu-search" role="search">
          <input placeholder="Search articles…" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn">Search</button>
        </form>

        <nav className="menu-nav" aria-label="Mobile">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} style={linkStyle}>
              {l.label}
            </NavLink>
          ))}

          {/* Auth controls inside the sheet on mobile */}
          {!user ? (
            <Link className="btn" to="/login" onClick={() => setOpen(false)}>Log in</Link>
          ) : (
            <button className="btn" onClick={() => { logout(); setOpen(false); }}>
              Log out
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
