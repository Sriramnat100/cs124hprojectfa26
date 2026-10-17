import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { api } from "../api.js";
import { BRANDS, FEATURES, SITUATIONS, labelFor } from "./constants.js";
import { dataUrlToBlob, timeToday } from "./helpers.js";
import { pinIcon } from "./pinIcon.js";

const FIVE_MINUTES = 5 * 60 * 1000;

export default function ReviewStep({ form, onEdit, onBack, onSubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(null);

  const photos = form.slots.filter((s) => s.dataUrl);
  const seen = timeToday(form.seenTime);

  // Warn if this person reported the same landmark in the last few minutes.
  useEffect(() => {
    if (!form.landmark) return;
    api("/sightings/mine")
      .then((list) => setDuplicate(list.find((s) => s.landmark === form.landmark && Date.now() - new Date(s.created_at) < FIVE_MINUTES) ?? null))
      .catch(() => {}); // the warning is a nice-to-have, so ignore errors
  }, [form.landmark]);

  async function submit() {
    if (submitting) return; // ignore double clicks
    setSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      for (const [i, photo] of photos.entries()) {
        body.append("photos", await dataUrlToBlob(photo.dataUrl), `photo${i + 1}.jpg`);
        body.append("photo_labels", photo.label);
      }
      body.append("lat", form.loc.lat);
      body.append("lng", form.loc.lng);
      body.append("landmark", form.landmark ?? "");
      body.append("seen_at", seen ? seen.toISOString() : "");
      body.append("brand", form.brand ?? "");
      body.append("color", form.color ?? "");
      body.append("features", JSON.stringify(form.features));
      body.append("situation", form.situation ?? "");
      body.append("notes", form.notes.trim());
      body.append("serial_number", (form.serialNumber ?? "").trim());
      onSubmitted(await api("/sightings", { method: "POST", body }));
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const detailText = [form.brand && labelFor(BRANDS, form.brand), form.color && form.color !== "unsure" && form.color].filter(Boolean).join(" · ");

  return (
    <>
      <div className="sg-body">
        <h2>Look good?</h2>
        <p className="muted">Check everything, then submit.</p>
        {duplicate && (
          <p className="sg-warn">🔁 You already reported a scooter near <b>{duplicate.landmark}</b> a few minutes ago. Is this a different one?</p>
        )}

        <div className="sg-review">
          <section className="sg-rcard sg-wide">
            <header>📸 Photos ({photos.length}) <button type="button" className="link" onClick={() => onEdit("photos")}>✏️ Edit</button></header>
            <div className="sg-thumbs">
              {photos.map((p, i) => <img key={i} src={p.dataUrl} alt={p.label} title={p.label} />)}
            </div>
          </section>

          <section className="sg-rcard">
            <header>📍 Where &amp; when <button type="button" className="link" onClick={() => onEdit("where")}>✏️ Edit</button></header>
            <p>{form.landmark ? <>Near <b>{form.landmark}</b></> : <b>Custom spot</b>}</p>
            <p className="muted">🕑 {seen ? `Today at ${seen.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Just now"}</p>
            <MapContainer
              center={[form.loc.lat, form.loc.lng]}
              zoom={16}
              className="sg-minimap"
              dragging={false}
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
              keyboard={false}
              attributionControl={false}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[form.loc.lat, form.loc.lng]} icon={pinIcon} interactive={false} />
            </MapContainer>
          </section>

          <section className="sg-rcard">
            <header>📝 Details <button type="button" className="link" onClick={() => onEdit("details")}>✏️ Edit</button></header>
            <p>{detailText || <span className="muted">No details, that's OK!</span>}</p>
            <div>
              {form.features.map((f) => <span key={f} className="sg-tagpill">{labelFor(FEATURES, f)}</span>)}
              {form.situation && <span className="sg-tagpill">{labelFor(SITUATIONS, form.situation)}</span>}
            </div>
            {form.serialNumber?.trim() && <p>🔢 Serial: <b>{form.serialNumber.trim().toUpperCase()}</b></p>}
            {form.notes.trim() && <p className="muted">"{form.notes.trim()}"</p>}
          </section>
        </div>

        {error && <p className="error sg-gap">{error}</p>}
      </div>

      <div className="sg-actions">
        <button type="button" className="sg-ghost" onClick={onBack} disabled={submitting}>← Back</button>
        <span className="sg-spacer" />
        <button type="button" onClick={submit} disabled={submitting}>{submitting ? "⏳ Submitting…" : "✓ Submit sighting"}</button>
      </div>
    </>
  );
}
