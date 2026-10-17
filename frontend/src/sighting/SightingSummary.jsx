import { BRANDS, FEATURES, SITUATIONS, labelFor } from "./constants.js";
import { formatWhen, photoUrl, timeAgo } from "./helpers.js";

// One sighting's details. Used in the map popup and in the list beside the map.
export default function SightingSummary({ sighting: s, showPhotos = true }) {
  const brandColor = [s.brand && labelFor(BRANDS, s.brand), s.color && s.color !== "unsure" && s.color].filter(Boolean).join(" · ");

  return (
    <div className="sg-summary">
      {showPhotos && s.photos.length > 0 && (
        <div className="sg-summary-photos">
          {s.photos.map((p, i) => <img key={i} src={photoUrl(p.url)} alt={p.label ?? "Scooter photo"} title={p.label ?? ""} loading="lazy" />)}
        </div>
      )}
      <b>{s.landmark ? `Near ${s.landmark}` : "Custom spot"}</b>
      {s.mine && <span className="sg-mine-tag">You reported this</span>}
      <div className="sg-summary-when" title={formatWhen(s.seen_at)}>🕑 {timeAgo(s.seen_at)}</div>
      <div>{brandColor || <span className="muted">No brand or color given</span>}</div>
      {(s.features.length > 0 || s.situation) && (
        <div>
          {s.features.map((f) => <span key={f} className="sg-tagpill">{labelFor(FEATURES, f)}</span>)}
          {s.situation && <span className="sg-tagpill">{labelFor(SITUATIONS, s.situation)}</span>}
        </div>
      )}
      {s.notes && <div className="muted">"{s.notes}"</div>}
    </div>
  );
}
