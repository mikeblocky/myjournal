import "./Topbar.css";
import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
    const { theme, toggle } = useTheme();
    const { user, logout } = useAuth();
    const nav = useNavigate();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");

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

    return (
        <>
            <header className="topbar" role="banner">
                <div className="brand">
                    <Link to="/" className="logo" aria-label="Home">✸</Link>
                    <Link to="/" className="title ui-mono">myjournal</Link>
                </div>

                <nav className="nav-inline" aria-label="Primary">
                    <NavLink to="/journal" style={linkStyle}>Journal</NavLink>
                    <NavLink to="/notes" style={linkStyle}>Notes</NavLink>
                    <NavLink to="/calendar" style={linkStyle}>Calendar</NavLink>
                    <NavLink to="/articles" style={linkStyle}>Articles</NavLink>
                    <NavLink to="/digest" style={linkStyle}>Daily Brief</NavLink>
                </nav>

                <div className="actions">
                    <form onSubmit={onSearch} className="search">
                        <input
                            aria-label="Search articles"
                            placeholder="Search…"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                        />
                    </form>

                    <Link className="btn" to="/journal/new">Write</Link>


                    <button className="btn" onClick={toggle} aria-label="Toggle theme">
                        {theme === "dark" ? "☀︎" : "☾"}
                    </button>

                    {!user ? (
                        <Link className="btn" to="/login">Log in</Link>
                    ) : (
                        <div className="account">
                            <span className="ui-mono id">{user.email.split("@")[0]}</span>
                            <button className="btn" onClick={logout}>Log out</button>
                        </div>
                    )}

                    <button
                        className="menu-btn"
                        aria-label="Open menu"
                        aria-expanded={open}
                        onClick={() => setOpen(v => !v)}
                    >☰</button>
                </div>
            </header>

            {/* Mobile sheet */}
            {open && <div className="backdrop" onClick={() => setOpen(false)} />}
            <div className={`menu-sheet ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
                <form onSubmit={onSearch} className="menu-search">
                    <input placeholder="Search articles…" value={q} onChange={e => setQ(e.target.value)} />
                    <button className="btn">Search</button>
                </form>
                <nav className="menu-nav" aria-label="Mobile">
                    <NavLink to="/journal" onClick={() => setOpen(false)} style={linkStyle}>Journal</NavLink>
                    <NavLink to="/notes" onClick={() => setOpen(false)} style={linkStyle}>Notes</NavLink>
                    <NavLink to="/calendar" onClick={() => setOpen(false)} style={linkStyle}>Calendar</NavLink>
                    <NavLink to="/articles" onClick={() => setOpen(false)} style={linkStyle}>Articles</NavLink>
                    <NavLink to="/digest" onClick={() => setOpen(false)} style={linkStyle}>Daily Brief</NavLink>
                </nav>
            </div>
        </>
    );
}
