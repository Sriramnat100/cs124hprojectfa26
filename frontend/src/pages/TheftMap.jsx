import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import TheftRiskMap, { HotspotSummary } from "../theft/TheftRiskMap.jsx";
import { formatDate } from "../theft/format.js";
import "../theft/theft.css";

// Theft Risk Map: where scooters and bikes get stolen, from the UIUC Police daily crime log.
// Data is imported with `python -m app.theft_data` (see backend/app/theft_data/).
export default function TheftMap() {
  const [range, setRange] = useState("semester");
  const [mode, setMode] = useState("heat");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // hotspot id

  useEffect(() => {
    setError("");
    setSelected(null);
    api(`/theft/map?range=${range}`).then(setData).catch((err) => setError(err.message));
  }, [range]);

  const hotspots = data?.hotspots ?? [];
  const selectedHotspot = hotspots.find((h) => h.id === selected) ?? null;
  const pickHotspot = (id) => { setMode("heat"); setSelected(id); };

  return (
    <main className="page theft-page">
      <Link to="/">← Home</Link>
      <h1>🚨 Theft risk map</h1>
      <p className="muted">
        Where scooters and bikes get stolen around campus, from the UIUC Police daily crime log.
      </p>

      <div className="theft-controls">
        <label>
          When
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {(data?.ranges ?? [{ value: range, label: "…" }]).map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <div className="theft-toggle" role="group" aria-label="Map style">
          <button type="button" className={mode === "heat" ? "on" : ""} onClick={() => setMode("heat")}>🔥 Heatmap</button>
          <button type="button" className={mode === "pins" ? "on" : ""} onClick={() => setMode("pins")}>📍 Pins</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <p className="theft-stats">
          <b>{data.total}</b> scooter/bike theft{data.total === 1 ? "" : "s"}
          {data.since ? ` since ${formatDate(data.since)}` : ""}
          {data.unmapped > 0 && <span className="muted"> · {data.unmapped} couldn't be placed on the map</span>}
        </p>
      )}

      <div className="theft-grid">
        <TheftRiskMap
          incidents={data?.incidents ?? []}
          hotspots={hotspots}
          mode={mode}
          labels={data?.category_labels ?? {}}
          selected={selectedHotspot}
          onSelectHotspot={setSelected}
        />

        <aside className="theft-side">
          <h2>Hotspots</h2>
          {!data && !error && <p className="muted">Loading…</p>}
          {data && hotspots.length === 0 && (
            <p className="muted">
              No thefts in this range. {data.last_import ? "Try a longer range." : "Import data first: python -m app.theft_data --sample"}
            </p>
          )}
          <ol className="theft-hotspots">
            {hotspots.slice(0, 8).map((h) => (
              <li key={h.id}>
                <button type="button" className={h.id === selected ? "on" : ""} onClick={() => pickHotspot(h.id)}>
                  <span className="theft-badge">{h.count}</span>
                  <span>
                    <b>{h.top_locations[0]?.name}</b>
                    <small className="muted">
                      {h.top_locations.length > 1 ? `+${h.top_locations.length - 1} nearby · ` : ""}last {formatDate(h.latest_date)}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {selectedHotspot && (
            <div className="theft-detail">
              <HotspotSummary hotspot={selectedHotspot} labels={data.category_labels} />
            </div>
          )}

          <div className="theft-legend">
            <span className="theft-gradient" /> fewer → more thefts
          </div>
          <p className="muted theft-note">
            The log lists crime types, not items. Here a "Motor Vehicle Theft" at a bike rack counts as a likely
            e-scooter/e-bike, and other thefts at bike racks as likely bikes.
            {data?.last_import && <> Last import: {formatDate(data.last_import.finished_at)}.</>}
          </p>
        </aside>
      </div>
    </main>
  );
}
