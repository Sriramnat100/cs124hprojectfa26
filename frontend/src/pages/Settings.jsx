import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { AVATAR_COLORS, initialsFor, loadSettings, saveSettings } from "../settings.js";
import "./settings.css";

// Settings: UI only. Everything here is saved in this browser, nothing goes to the backend.
export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState(() => loadSettings(user));
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(0);

  const update = (changes) => {
    const next = { ...s, ...changes };
    setS(next);
    saveSettings(user, next);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  };

  return (
    <main className="page st-page">
      <header className="st-head">
        <div>
          <span className="st-eyebrow">Settings</span>
          <h1>Your preferences</h1>
          <p className="muted">Saved on this device only.</p>
        </div>
        <span className={`st-saved ${saved ? "show" : ""}`} role="status">✓ Saved</span>
      </header>

      <section className="st-card" aria-labelledby="st-profile">
        <h2 id="st-profile">Profile</h2>
        <div className="st-profile">
          <span className="st-avatar" style={{ background: AVATAR_COLORS[s.avatarColor] }}>{initialsFor(user, s)}</span>
          <div className="st-fields">
            <label className="st-field">
              Display name
              <input value={s.displayName} maxLength={40} placeholder={user.email.split("@")[0]} onChange={(e) => update({ displayName: e.target.value })} />
            </label>
            <div className="st-field">
              Avatar color
              <div className="st-swatches" role="radiogroup" aria-label="Avatar color">
                {Object.entries(AVATAR_COLORS).map(([name, bg]) => (
                  <button key={name} type="button" role="radio" aria-checked={s.avatarColor === name} aria-label={name}
                    className={`st-swatch ${s.avatarColor === name ? "on" : ""}`} style={{ background: bg }} onClick={() => update({ avatarColor: name })} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="st-card" aria-labelledby="st-appearance">
        <h2 id="st-appearance">Appearance</h2>
        <Toggle label="Reduce motion" hint="Turns off the scroll animations and the moving 3D scooter on the home page."
          checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
      </section>

      <section className="st-card" aria-labelledby="st-prefs">
        <h2 id="st-prefs">Preferences</h2>
        <label className="st-row">
          <span><b>Default map time range</b><small>What Explore Map shows first.</small></span>
          <select value={s.mapRange} onChange={(e) => update({ mapRange: e.target.value })}>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <Toggle label="Match alerts" hint="Tell me when a sighting looks like my stolen scooter. (Alerts are coming soon.)"
          checked={s.notifyMatches} onChange={(v) => update({ notifyMatches: v })} />
        <Toggle label="Weekly campus summary" hint="A short recap of sightings near you. (Coming soon.)"
          checked={s.notifyWeekly} onChange={(v) => update({ notifyWeekly: v })} />
      </section>

      <section className="st-card" aria-labelledby="st-account">
        <h2 id="st-account">Account</h2>
        <div className="st-row">
          <span><b>Email</b><small>{user.email}</small></span>
          <button type="button" className="st-logout" onClick={async () => { await logout(); navigate("/"); }}>Log out</button>
        </div>
      </section>
    </main>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="st-row">
      <span><b>{label}</b><small>{hint}</small></span>
      <input type="checkbox" role="switch" className="st-switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
