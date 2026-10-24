import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { label } from "../scooterOptions.js";
import "./scooters.css";

// Feature 1: the owner's list of registered scooters.
export default function MyScooters() {
  const [scooters, setScooters] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/scooters/mine").then(setScooters).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="page narrow">
      <Link to="/">← Home</Link>
      <header className="topbar">
        <h1>My scooters</h1>
        {scooters?.length > 0 && <Link to="/register-scooter" className="button small">＋ Add</Link>}
      </header>

      {error && <p className="error">{error}</p>}
      {!scooters && !error && <p className="muted">Loading…</p>}

      {scooters?.length === 0 && (
        <div className="empty">
          <span className="emoji">🛴</span>
          <p>You haven't registered a scooter yet. Setting one up earns you <b>20 points</b>.</p>
          <Link to="/register-scooter" className="button">Register your first scooter</Link>
        </div>
      )}

      <div className="scooter-list">
        {scooters?.map((s) => (
          <Link key={s.id} to={`/scooters/${s.id}`} className="scooter-row">
            {s.photos[0] && <img src={`/api${s.photos[0]}`} alt="" />}
            <div>
              <b>{label(s.brand)} {s.model}</b>
              <small className="muted">{label(s.color)}</small>
            </div>
            <StatusBadge status={s.status} />
          </Link>
        ))}
      </div>
    </main>
  );
}

export function StatusBadge({ status }) {
  return status === "stolen"
    ? <span className="badge stolen">🚨 Stolen</span>
    : <span className="badge">Registered</span>;
}
