import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { label } from "../scooterOptions.js";
import { COLORS } from "../sighting/constants.js";
import "./scooters.css";
import "./matches.css";

// Feature 3 (draft): your stolen scooters, each with the sightings ranked by how likely they are to be it.
// Scoring lives in backend/app/matching.py.
export default function Matches() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showWeak, setShowWeak] = useState(false);

  useEffect(() => {
    api("/matches").then(setData).catch((err) => setError(err.message));
  }, []);

  const results = data?.results ?? [];

  return (
    <main className="page wide">
      <Link to="/">← Home</Link>
      <h1>🔎 Possible matches <span className="draft">draft</span></h1>
      <p className="muted">
        Your stolen scooters, with sightings ranked from most to least likely.
        A serial number match always goes first.
      </p>

      <details className="how">
        <summary>How the score works</summary>
        <ul>
          <li><b>Serial number</b> typed by the spotter or found in their notes (dashes, spaces and case ignored) → <b>100</b>, always ranked first.</li>
          <li><b>Brand</b> +25 if same, −20 if different, 0 if the spotter wasn't sure. <b>Color</b> works the same way.</li>
          <li><b>Description</b> up to +50: the owner's marks vs. the spotter's features and notes, compared word by word. Synonyms count as the same word ("decal" = "sticker", "broken" = "cracked"), and rare words like "duck" count more than common ones.</li>
          <li><b>−15</b> if it was seen before the scooter was reported stolen.</li>
          <li>Tiers: <b>strong</b> 60+, <b>possible</b> 30+, <b>weak</b> below 30.</li>
        </ul>
        <p className="muted">Try more fake data: <code>python -m app.seed_demo</code> in <code>backend/</code>, then log in as one of the demo owners it prints.</p>
      </details>

      <div className="filters">
        <label><input type="checkbox" checked={showWeak} onChange={(e) => setShowWeak(e.target.checked)} /> Show weak matches</label>
      </div>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && results.length === 0 && (
        <p className="muted empty">
          None of your scooters are marked stolen. If one is, mark it stolen from <Link to="/my-scooters">My scooters</Link> and its likely sightings show up here.
        </p>
      )}

      {results.map(({ scooter, matches }) => (
        <ScooterMatches key={scooter.id} scooter={scooter} matches={matches} showWeak={showWeak} />
      ))}
    </main>
  );
}

function ScooterMatches({ scooter, matches, showWeak }) {
  const visible = matches.filter((m) => showWeak || m.tier !== "weak");
  const hidden = matches.length - visible.length;

  return (
    <section className="match-group">
      <header className="stolen-card">
        <Thumb photo={scooter.photos[0]} color={scooter.color} />
        <div className="stolen-info">
          <b>{label(scooter.brand)} {scooter.model}</b>
          <small className="muted">
            {label(scooter.color)}
            {scooter.serial_number && <> · Serial {scooter.serial_number}</>}
            {" · "}stolen {timeAgo(scooter.stolen_at)}
          </small>
          {scooter.marks && <small>“{scooter.marks}”</small>}
        </div>
        <span className="badge stolen">🚨 Stolen</span>
      </header>

      {visible.length === 0 && <p className="muted none">No likely sightings yet.</p>}
      <ol className="match-list">
        {visible.map((m, i) => <MatchRow key={m.sighting.id} rank={i + 1} match={m} />)}
      </ol>
      {hidden > 0 && <p className="muted hidden-count">{hidden} weak match{hidden === 1 ? "" : "es"} hidden</p>}
    </section>
  );
}

const TIER_LABELS = { serial: "🔢 Serial match", strong: "Strong", possible: "Possible", weak: "Weak" };

function MatchRow({ rank, match }) {
  const { sighting: s, score, tier, reasons, shared_words } = match;
  const details = [
    s.brand && s.brand !== "unsure" ? label(s.brand) : "Brand ?",
    s.color && s.color !== "unsure" ? label(s.color) : "Color ?",
    ...s.features,
  ];

  return (
    <li className={`match tier-${tier}`}>
      <span className="rank">#{rank}</span>
      <Thumb photo={s.photos[0]} color={s.color} />
      <div className="match-body">
        <div className="match-top">
          <span className={`tier tier-${tier}`}>{TIER_LABELS[tier]}</span>
          <span className="score">{score}</span>
          <div className="bar"><div style={{ width: `${score}%` }} /></div>
        </div>
        <small>{details.join(" · ")}</small>
        {s.notes && <small className="notes">“{s.notes}”</small>}
        <small className="muted">📍 {s.landmark || "Pinned on map"} · {timeAgo(s.seen_at)}</small>
        <div className="reasons">
          {reasons.map((r) => <span key={r} className={reasonClass(r)}>{r}</span>)}
          {shared_words.length > 0 && <span className="chip words">words: {shared_words.join(", ")}</span>}
        </div>
      </div>
    </li>
  );
}

function reasonClass(reason) {
  if (reason.startsWith("Same") || reason.startsWith("Serial") || reason.startsWith("Description")) return "chip good";
  if (reason.startsWith("Different") || reason.startsWith("Seen before")) return "chip bad";
  return "chip";
}

// Photo if there is one, otherwise a swatch in the scooter's color.
function Thumb({ photo, color }) {
  if (photo) return <img className="thumb" src={`/api${photo}`} alt="" />;
  const swatch = COLORS.find((c) => c.value === color)?.swatch ?? "var(--line)";
  return <div className="thumb swatch" style={{ background: swatch }}>🛴</div>;
}

// Handles both "2026-10-17 18:00:00" (UTC, from SQLite) and full ISO times.
function timeAgo(value) {
  if (!value) return "";
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const hours = Math.round((Date.now() - new Date(iso)) / 36e5);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
