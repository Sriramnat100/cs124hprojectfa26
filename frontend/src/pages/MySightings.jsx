import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { BRANDS, FEATURES, SITUATIONS, labelFor } from "../sighting/constants.js";
import { formatWhen, photoUrl } from "../sighting/helpers.js";
import "../sighting/sighting.css";

// Feature 2: the sightings the logged-in user has submitted.
export default function MySightings() {
  const [sightings, setSightings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/sightings/mine").then(setSightings).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="page sg-page">
      <Link to="/">← Home</Link>
      <header className="topbar sg-title">
        <h1>📋 My sightings</h1>
        {sightings && <span className="sg-points">🏆 {sightings.length * 10} pts</span>}
      </header>

      {error && <p className="error">{error}</p>}
      {!sightings && !error && <p className="muted">Loading…</p>}
      {sightings?.length === 0 && (
        <p className="muted">No sightings yet. <Link to="/submit-sighting">Report your first one</Link> to earn 10 points.</p>
      )}

      <div className="sg-list">
        {sightings?.map((s) => (
          <article key={s.id} className="sg-item">
            <div className="sg-item-photos">
              {s.photos.map((p, i) => <img key={i} src={photoUrl(p.url)} alt={p.label ?? "Scooter photo"} title={p.label ?? ""} />)}
            </div>
            <div className="sg-item-text">
              <b>{s.landmark ? `Near ${s.landmark}` : "Custom spot"}</b>
              <span className="muted"> · {formatWhen(s.seen_at)}</span>
              <p>
                {[s.brand && labelFor(BRANDS, s.brand), s.color && s.color !== "unsure" && s.color].filter(Boolean).join(" · ") ||
                  <span className="muted">No brand or color given</span>}
              </p>
              <div>
                {s.features.map((f) => <span key={f} className="sg-tagpill">{labelFor(FEATURES, f)}</span>)}
                {s.situation && <span className="sg-tagpill">{labelFor(SITUATIONS, s.situation)}</span>}
              </div>
              {s.serial_number && <p>🔢 Serial: <b>{s.serial_number}</b></p>}
              {s.notes && <p className="muted">"{s.notes}"</p>}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
