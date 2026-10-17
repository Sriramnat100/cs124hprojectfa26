import { BRANDS, COLORS, FEATURES, MAX_NOTES, MAX_SERIAL, SITUATIONS } from "./constants.js";

export default function DetailsStep({ form, update, onNext, onBack }) {
  // Clicking a selected option again unselects it, because every detail is optional.
  const toggle = (field, value) => update({ [field]: form[field] === value ? null : value });
  const toggleFeature = (value) =>
    update({ features: form.features.includes(value) ? form.features.filter((f) => f !== value) : [...form.features, value] });

  return (
    <>
      <div className="sg-body">
        <h2>Anything you noticed?</h2>
        <p className="muted">All optional. "Not sure" is totally fine.</p>

        <div className="sg-details">
          <div className="sg-field">
            <span className="sg-label">Brand</span>
            <div className="sg-brands">
              {BRANDS.map((b) => (
                <button key={b.value} type="button" className={`sg-chip ${form.brand === b.value ? "on" : ""}`} onClick={() => toggle("brand", b.value)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sg-field">
            <span className="sg-label">Color</span>
            <div className="sg-swatches">
              {COLORS.map((c) => (
                <div key={c.value} className="sg-swatch-wrap">
                  <button
                    type="button"
                    className={`sg-swatch ${form.color === c.value ? "on" : ""}`}
                    style={{ background: c.swatch }}
                    onClick={() => toggle("color", c.value)}
                    aria-label={c.label ?? c.value}
                    aria-pressed={form.color === c.value}
                  />
                  <small>{c.label ?? c.value}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="sg-field">
            <span className="sg-label">Features <small className="muted">· click all that apply</small></span>
            <div className="sg-chips">
              {FEATURES.map((f) => (
                <button key={f.value} type="button" className={`sg-chip ${form.features.includes(f.value) ? "on" : ""}`} onClick={() => toggleFeature(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sg-field">
            <span className="sg-label">Situation</span>
            <div className="sg-chips">
              {SITUATIONS.map((s) => (
                <button key={s.value} type="button" className={`sg-chip ${form.situation === s.value ? "on" : ""}`} onClick={() => toggle("situation", s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <label className="sg-field sg-wide">
            <span className="sg-label">Serial number <small className="muted">· only if you can read it</small></span>
            <input
              value={form.serialNumber}
              maxLength={MAX_SERIAL}
              placeholder="Usually under the deck or on the stem"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => update({ serialNumber: e.target.value })}
            />
            <small className="muted">The strongest clue there is: a matching serial number finds the owner right away.</small>
          </label>

          <label className="sg-field sg-wide">
            <span className="sg-label">Notes <small className="muted">· e.g. "duck sticker on the stem"</small></span>
            <textarea
              value={form.notes}
              maxLength={MAX_NOTES}
              rows={3}
              placeholder="Anything that makes it unique…"
              onChange={(e) => update({ notes: e.target.value })}
            />
            <small className="muted sg-counter">{form.notes.length}/{MAX_NOTES}</small>
          </label>
        </div>
      </div>

      <div className="sg-actions">
        <button type="button" className="sg-ghost" onClick={onBack}>← Back</button>
        <span className="sg-spacer" />
        <button type="button" className="sg-ghost" onClick={onNext}>Skip</button>
        <button type="button" onClick={onNext}>Next →</button>
      </div>
    </>
  );
}
