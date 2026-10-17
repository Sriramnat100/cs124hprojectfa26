import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import SightingSummary from "../sighting/SightingSummary.jsx";
import SightingsMap from "../sighting/SightingsMap.jsx";
import { BRANDS, COLORS, LANDMARKS } from "../sighting/constants.js";
import "../sighting/sighting.css";

// View sightings: everyone's sightings on a map, with filters and a list.
// The backend never sends who reported a sighting; `mine` marks your own (blue pins).

const TIME_RANGES = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export default function ViewSightings() {
  const [days, setDays] = useState("7");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [all, setAll] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState({ id: null, from: null });
  const listItems = useRef(new Map());

  // The time range is filtered by the backend; brand, color and landmark instantly in the browser.
  useEffect(() => {
    setError("");
    api(days === "all" ? "/sightings/map" : `/sightings/map?days=${days}`)
      .then(setAll)
      .catch((err) => setError(err.message));
  }, [days]);

  const shown = useMemo(
    () => (all ?? []).filter((s) => (!brand || s.brand === brand) && (!color || s.color === color) && (!landmark || s.landmark === landmark)),
    [all, brand, color, landmark]
  );

  // When a pin is clicked, scroll its card into view in the list.
  useEffect(() => {
    if (selected.from === "map") listItems.current.get(selected.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  const select = (id, from) => setSelected({ id, from });
  const filtersOn = brand || color || landmark;
  const clearFilters = () => { setBrand(""); setColor(""); setLandmark(""); };

  return (
    <main className="page sg-page sg-viewpage">
      <Link to="/">← Home</Link>
      <header className="topbar sg-title">
        <h1>🗺️ View sightings</h1>
        <span className="sg-legend">
          <span className="sg-dot" /> Sightings <span className="sg-dot mine" /> Yours
        </span>
      </header>

      <div className="sg-filters">
        <label>
          When
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            {TIME_RANGES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label>
          Brand
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Any brand</option>
            {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label>
          Color
          <select value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="">Any color</option>
            {COLORS.map((c) => <option key={c.value} value={c.value}>{c.label ?? c.value}</option>)}
          </select>
        </label>
        <label>
          Near
          <select value={landmark} onChange={(e) => setLandmark(e.target.value)}>
            <option value="">Anywhere</option>
            {LANDMARKS.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
          </select>
        </label>
        {filtersOn && <button type="button" className="link" onClick={clearFilters}>Clear filters</button>}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="sg-viewgrid">
        <SightingsMap
          sightings={shown}
          fitKey={`${days}|${brand}|${color}|${landmark}|${all?.length ?? 0}`}
          landmark={landmark}
          selected={selected}
          onSelect={select}
        />

        <aside className="sg-viewlist" aria-label="Sightings list">
          <p className="muted sg-viewcount">
            {all === null ? "Loading…" : `Showing ${shown.length} of ${all.length} sighting${all.length === 1 ? "" : "s"}`}
          </p>
          {all !== null && shown.length === 0 && (
            <p className="muted">
              No sightings match. {filtersOn ? <button type="button" className="link" onClick={clearFilters}>Clear filters</button> : "Try a longer time range."}
            </p>
          )}
          {shown.map((s) => (
            <button
              key={s.id}
              type="button"
              ref={(el) => (el ? listItems.current.set(s.id, el) : listItems.current.delete(s.id))}
              className={`sg-viewitem ${selected.id === s.id ? "on" : ""} ${s.mine ? "mine" : ""}`}
              onClick={() => select(s.id, "list")}
            >
              <SightingSummary sighting={s} />
            </button>
          ))}
        </aside>
      </div>
    </main>
  );
}
