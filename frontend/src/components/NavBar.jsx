import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { AVATAR_COLORS, initialsFor, useSettings } from "../settings.js";
import "./nav.css";

// Glass navigation bar shown on every page.
export default function NavBar() {
  const { user, logout } = useAuth();
  const settings = useSettings(user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [points, setPoints] = useState(null);
  const menuRef = useRef(null);

  // Close menus when the page changes, on outside clicks, and on Escape.
  useEffect(() => { setMenuOpen(false); setLinksOpen(false); }, [pathname]);
  useEffect(() => {
    const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setMenuOpen(false); setLinksOpen(false); } };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    if (menuOpen && user) api("/sightings/points").then((d) => setPoints(d.points)).catch(() => {});
  }, [menuOpen, user]);

  // "Edit" opens your scooter's edit page, or registration if you don't have one yet.
  async function openEdit(e) {
    e.preventDefault();
    if (!user) return navigate("/login");
    try {
      const mine = await api("/scooters/mine");
      navigate(mine.length ? `/scooters/${mine[0].id}/edit` : "/register-scooter");
    } catch {
      navigate("/my-scooters");
    }
  }

  const scooterActive = pathname === "/my-scooters" || pathname === "/register-scooter" || (pathname.startsWith("/scooters/") && !pathname.endsWith("/edit"));
  const linkClass = (active) => (active ? "active" : undefined);

  return (
    <header className="nav">
      <Link className="nav-brand" to="/" aria-label="ScooterTrace home">
        <span className="nav-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#06121F" strokeWidth="2.4" strokeLinecap="round"><path d="M7 18l6-12h3" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M6 18h12" /></svg>
        </span>
        ScooterTrace
      </Link>

      <nav className={`nav-links ${linksOpen ? "open" : ""}`} id="nav-links" aria-label="Main">
        <NavLink to="/my-scooters" className={() => linkClass(scooterActive)}>My Scooter</NavLink>
        <NavLink to="/submit-sighting" className={({ isActive }) => linkClass(isActive)}>Reporting</NavLink>
        <a href="/edit" onClick={openEdit} className={linkClass(pathname.endsWith("/edit"))}>Edit</a>
        <NavLink to="/view-sightings" className={({ isActive }) => linkClass(isActive)}>Explore Map</NavLink>
        <NavLink to="/theft-map" className={({ isActive }) => linkClass(isActive)}>Theft Map</NavLink>
        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)}>Settings</NavLink>
      </nav>

      <div className="nav-right" ref={menuRef}>
        <button type="button" className="nav-burger" aria-label="Open menu" aria-expanded={linksOpen} aria-controls="nav-links" onClick={() => setLinksOpen((o) => !o)}>
          <span /><span />
        </button>
        {user ? (
          <>
            <button
              type="button"
              className="nav-avatar"
              style={{ background: AVATAR_COLORS[settings.avatarColor] ?? AVATAR_COLORS.teal }}
              aria-label="Profile menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {initialsFor(user, settings)}
            </button>
            <div className={`nav-menu ${menuOpen ? "open" : ""}`} role="menu">
              <div className="nav-who">
                <b>{settings.displayName || user.email.split("@")[0]}</b>
                <span>{user.email}</span>
                {points !== null && <span className="points nav-points">🏆 {points} points</span>}
              </div>
              <Link to="/my-sightings" role="menuitem">My sightings</Link>
              <Link to="/matches" role="menuitem">Possible matches</Link>
              <Link to="/settings" role="menuitem">Settings</Link>
              <button type="button" role="menuitem" className="nav-logout" onClick={async () => { await logout(); navigate("/"); }}>Log out</button>
            </div>
          </>
        ) : (
          <Link to="/login" className="nav-login">Log in</Link>
        )}
      </div>
    </header>
  );
}
