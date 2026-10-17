import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { label } from "../scooterOptions.js";
import { StatusBadge } from "./MyScooters.jsx";
import "./scooters.css";

// Feature 1: one scooter's photos and details, plus the Mark stolen / recovered button.
export default function ScooterDetail() {
  const { id } = useParams();
  const [scooter, setScooter] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Asking "are you sure?" in the page, because some browsers (like embedded
  // previews) silently block window.confirm and it would always say no.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api(`/scooters/${id}`).then(setScooter).catch((err) => setError(err.message));
  }, [id]);

  async function setStolen(stolen) {
    setConfirming(false);
    setBusy(true);
    setError("");
    try {
      setScooter(await api(`/scooters/${id}/${stolen ? "stolen" : "recovered"}`, { method: "POST" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!scooter) {
    return (
      <main className="page narrow">
        <Link to="/my-scooters">← My scooters</Link>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}
      </main>
    );
  }

  const stolen = scooter.status === "stolen";

  return (
    <main className="page narrow">
      <Link to="/my-scooters">← My scooters</Link>
      <header className="topbar">
        <h1>{label(scooter.brand)} {scooter.model}</h1>
        <StatusBadge status={scooter.status} />
      </header>

      <div className="photo-grid detail">
        {scooter.photos.map((url, i) => (
          <a key={url} href={`/api${url}`} target="_blank" rel="noreferrer" className="photo">
            <img src={`/api${url}`} alt={`Photo ${i + 1}`} />
          </a>
        ))}
      </div>

      <dl className="details">
        <dt>Brand</dt><dd>{label(scooter.brand)}</dd>
        <dt>Model</dt><dd>{scooter.model || "—"}</dd>
        <dt>Color</dt><dd>{label(scooter.color)}</dd>
        <dt>Serial number</dt><dd>{scooter.serial_number || "—"}</dd>
        <dt>Marks</dt><dd>{scooter.marks || "—"}</dd>
        <dt>Registered</dt><dd>{formatDate(scooter.created_at)}</dd>
        {stolen && <><dt>Reported stolen</dt><dd>{formatDate(scooter.stolen_at)}</dd></>}
      </dl>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        {stolen ? (
          <button className="secondary" onClick={() => setStolen(false)} disabled={busy}>
            ✅ Mark as recovered
          </button>
        ) : confirming ? (
          <div className="confirm">
            <p>Mark this scooter as stolen? New sightings will be checked against it.</p>
            <button className="danger" onClick={() => setStolen(true)} disabled={busy}>Yes, it's stolen</button>
            <button className="secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
          </div>
        ) : (
          <button className="danger" onClick={() => setConfirming(true)} disabled={busy}>
            🚨 Mark as stolen
          </button>
        )}
        <Link to={`/scooters/${id}/edit`} className="button secondary">Edit details</Link>
      </div>
    </main>
  );
}

// SQLite stores UTC as "2026-10-17 18:30:00".
function formatDate(value) {
  return value ? new Date(value.replace(" ", "T") + "Z").toLocaleString() : "—";
}
