import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { BRANDS, COLORS, label } from "../scooterOptions.js";
import "./scooters.css";

const MIN_PHOTOS = 2;
const EMPTY = { brand: "", model: "", color: "", serial_number: "", marks: "" };

// Feature 1: Register a scooter (the owner's side).
// The same form edits an existing scooter at /scooters/:id/edit (details only, not photos).
export default function RegisterScooter() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [details, setDetails] = useState(EMPTY);
  const [photos, setPhotos] = useState([]); // [{ file, preview }]
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // When editing, fill the form with the scooter's current details.
  useEffect(() => {
    if (!editing) return;
    api(`/scooters/${id}`)
      .then((s) => setDetails({
        brand: s.brand,
        model: s.model,
        color: s.color,
        serial_number: s.serial_number ?? "",
        marks: s.marks,
      }))
      .catch((err) => setError(err.message));
  }, [editing, id]);

  // Free the preview URLs when the page closes.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function update(field) {
    return (e) => setDetails({ ...details, [field]: e.target.value });
  }

  function addPhotos(e) {
    const added = [...e.target.files].map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos([...photos, ...added]);
    e.target.value = ""; // so picking the same photo again still fires onChange
  }

  function removePhoto(index) {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos(photos.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!editing && photos.length < MIN_PHOTOS) {
      setError(`Please add at least ${MIN_PHOTOS} photos`);
      return;
    }

    setBusy(true);
    try {
      let scooter;
      if (editing) {
        scooter = await api(`/scooters/${id}`, { method: "PUT", body: details });
      } else {
        const form = new FormData();
        Object.entries(details).forEach(([key, value]) => form.append(key, value));
        photos.forEach((p) => form.append("photos", p.file));
        scooter = await api("/scooters", { method: "POST", body: form });
      }
      navigate(`/scooters/${scooter.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="page narrow">
      <Link to={editing ? `/scooters/${id}` : "/my-scooters"}>← Back</Link>
      <h1>{editing ? "Edit scooter" : "🛴 Register my scooter"}</h1>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Brand
          <select value={details.brand} onChange={update("brand")} required>
            <option value="" disabled>Pick a brand</option>
            {BRANDS.map((b) => <option key={b} value={b}>{label(b)}</option>)}
          </select>
        </label>
        <label>
          <span>Model <span className="optional">optional</span></span>
          <input value={details.model} onChange={update("model")} placeholder="e.g. Ninebot Max G30" />
        </label>
        <label>
          Color
          <select value={details.color} onChange={update("color")} required>
            <option value="" disabled>Pick the main color</option>
            {COLORS.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
        </label>
        <label>
          <span>Serial number <span className="optional">optional</span></span>
          <input
            value={details.serial_number}
            onChange={update("serial_number")}
            placeholder="Usually under the deck or on the stem"
          />
        </label>
        <label>
          <span>Distinguishing marks <span className="optional">optional</span></span>
          <textarea
            rows={3}
            value={details.marks}
            onChange={update("marks")}
            placeholder="Stickers, scratches, a different-colored grip…"
          />
        </label>

        {!editing && (
          <div className="photo-field">
            <b>Photos <span className="optional">at least {MIN_PHOTOS}</span></b>
            <p className="muted hint">A full side view, plus close-ups of any stickers or marks.</p>
            <div className="photo-grid">
              {photos.map((p, i) => (
                <div key={p.preview} className="photo">
                  <img src={p.preview} alt={`Photo ${i + 1}`} />
                  <button type="button" className="remove" onClick={() => removePhoto(i)} aria-label="Remove photo">
                    ✕
                  </button>
                </div>
              ))}
              <label className="photo add">
                <span>＋ Add</span>
                <input type="file" accept="image/*" multiple onChange={addPhotos} hidden />
              </label>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save changes" : "Register scooter"}
        </button>
      </form>
    </main>
  );
}
