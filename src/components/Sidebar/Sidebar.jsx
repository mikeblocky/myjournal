import "./Sidebar.css";
import { useTheme } from "../../context/ThemeContext";
import { NavLink, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function Sidebar({ open, onClose }) {
    const { theme, toggle } = useTheme();
    const { user, logout } = useAuth();

    useEffect(() => {
        const onKey = e => e.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    function NavItem({ to, children }) {
        return (
            <NavLink to={to} className="nav-link" onClick={onClose}
                style={({ isActive }) => ({
                    display: "block", padding: "10px 12px", borderRadius: 10,
                    color: "var(--text)", background: isActive ? "color-mix(in oklab, var(--panel) 80%, var(--accent) 20%)" : "transparent"
                })}>
                {children}
            </NavLink>
        );
    }

    return (
        <aside className={`panel sidebar fade-in ${open ? "open" : ""}`} aria-label="Sidebar">
            <div className="brand">
                <div className="logo">✸</div>
                <Link to="/" className="title ui-mono" onClick={onClose}>myjournal</Link>
            </div>

            <nav className="nav" aria-label="Primary" style={{ display: "grid", gap: 4 }}>
                <NavItem to="/journal">Journal</NavItem>
                <NavItem to="/notes">Notes</NavItem>
                <NavItem to="/calendar">Calendar</NavItem>
                <NavItem to="/articles">Articles</NavItem>
                <NavItem to="/digest">Daily Brief</NavItem>
            </nav>

            <div className="grow" />

            <div className="actions">
                <button className="btn" onClick={toggle}>Theme: {theme}</button>
                {!user ? (
                    <Link className="btn" to="/login" onClick={onClose}>Log in / Sign up</Link>
                ) : (
                    <button className="btn" onClick={logout}>Log out ({user.email})</button>
                )}
            </div>
        </aside>
    );
}
