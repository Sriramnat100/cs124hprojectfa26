import { useRef, useState } from "react";
import { GUIDED_SLOTS, MAX_PHOTOS, MIN_PHOTOS } from "./constants.js";
import { resizeImage } from "./helpers.js";

export default function PhotosStep({ form, update, onNext, onCancel, draft, onContinueDraft, onDiscardDraft }) {
  const [chooserFor, setChooserFor] = useState(null); // index of the box being filled
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const galleryInput = useRef(null);
  const cameraInput = useRef(null);
  const targetSlot = useRef(null);

  const count = form.slots.filter((s) => s.dataUrl).length;

  // Put the files into the chosen box first, then any empty boxes, adding boxes up to MAX_PHOTOS.
  async function addFiles(fileList, startSlot) {
    const files = [...fileList];
    if (!files.length) return;
    setError("");
    setBusy(true);
    const slots = form.slots.map((s) => ({ ...s }));
    const order = [];
    if (startSlot != null) order.push(startSlot);
    slots.forEach((s, i) => { if (!s.dataUrl && i !== startSlot) order.push(i); });

    const failed = [];
    let skipped = 0;
    for (const file of files) {
      let i = order.shift();
      if (i === undefined) {
        if (slots.length >= MAX_PHOTOS) { skipped++; continue; }
        slots.push({ label: "Extra angle", required: false, dataUrl: null });
        i = slots.length - 1;
      }
      try {
        slots[i].dataUrl = await resizeImage(file);
      } catch {
        failed.push(file.name);
        order.unshift(i);
      }
    }
    update({ slots });
    setBusy(false);

    const messages = [];
    if (failed.length) messages.push(`Couldn't read ${failed.join(", ")}. Try a JPG or PNG (iPhone HEIC photos don't open in every browser).`);
    if (skipped) messages.push(`You can add up to ${MAX_PHOTOS} photos, so ${skipped} ${skipped === 1 ? "was" : "were"} skipped.`);
    setError(messages.join(" "));
  }

  function pick(input, slot) {
    targetSlot.current = slot;
    setChooserFor(null);
    input.current.click();
  }

  function onFilesChosen(e) {
    addFiles(e.target.files, targetSlot.current);
    e.target.value = ""; // so choosing the same file again still triggers a change
  }

  function remove(i) {
    const slots = form.slots.map((s) => ({ ...s }));
    if (i >= GUIDED_SLOTS.length) slots.splice(i, 1); // extra boxes disappear
    else slots[i].dataUrl = null; // guided boxes stay, just empty
    update({ slots });
  }

  function addBox() {
    if (form.slots.length < MAX_PHOTOS) update({ slots: [...form.slots, { label: "Extra angle", required: false, dataUrl: null }] });
  }

  return (
    <>
      <div className="sg-body">
        {draft && (
          <div className="sg-banner">
            <span>
              📝 <b>Continue your last report?</b> You left one unfinished {draft.summary}.
            </span>
            <span className="sg-row">
              <button type="button" className="sg-ghost" onClick={onDiscardDraft}>Start over</button>
              <button type="button" onClick={onContinueDraft}>Continue →</button>
            </span>
          </div>
        )}

        <h2>Add {MIN_PHOTOS}+ photos</h2>
        <p className="muted">Photos from different angles help match it to a stolen scooter.</p>

        <div
          className={`sg-drop ${dragOver ? "over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files, null); }}
        >
          <div className="sg-drop-emoji">🖼️</div>
          <b>Drag &amp; drop photos here</b> or{" "}
          <button type="button" className="link" onClick={() => pick(galleryInput, null)}>browse your files</button>
          <br />
          <small className="muted">On a phone, tap a box below to open the camera.</small>
        </div>

        <div className="sg-slots">
          {form.slots.map((slot, i) =>
            slot.dataUrl ? (
              <div key={i} className="sg-slot filled">
                <img src={slot.dataUrl} alt={slot.label} />
                <span className="sg-slot-actions">
                  <button type="button" title="Replace" aria-label={`Replace ${slot.label}`} onClick={() => setChooserFor(i)}>↻</button>
                  <button type="button" title="Remove" aria-label={`Remove ${slot.label}`} onClick={() => remove(i)}>✕</button>
                </span>
                <span className="sg-slot-label">{slot.label}</span>
              </div>
            ) : (
              <button key={i} type="button" className="sg-slot" onClick={() => setChooserFor(i)}>
                <span className={slot.required ? "sg-tag needed" : "sg-tag"}>{slot.required ? "needed" : "optional"}</span>
                <span className="sg-slot-icon">🛴</span>
                {slot.label}
              </button>
            )
          )}
          {form.slots.length < MAX_PHOTOS && (
            <button type="button" className="sg-slot add" onClick={addBox}>
              ＋ Add another angle
              <small>{MAX_PHOTOS - form.slots.length} more allowed</small>
            </button>
          )}
        </div>

        {busy && <p className="muted">Shrinking photos…</p>}
        {error && <p className="error">{error}</p>}
        <p className="sg-tip">🙂 <b>Tip:</b> try to keep people's faces out of the shot.</p>
      </div>

      <div className="sg-actions">
        <button type="button" className="sg-ghost" onClick={onCancel}>Cancel</button>
        <span className="sg-spacer" />
        <span className={`sg-count ${count >= MIN_PHOTOS ? "ok" : ""}`}>
          {count >= MIN_PHOTOS ? `✓ ${count} photos` : `${MIN_PHOTOS - count} more needed`}
        </span>
        <button type="button" onClick={onNext} disabled={count < MIN_PHOTOS || busy}>Next →</button>
      </div>

      {chooserFor !== null && (
        <div className="sg-overlay" onClick={() => setChooserFor(null)}>
          <div className="sg-modal" role="dialog" aria-modal="true" aria-label="Add a photo" onClick={(e) => e.stopPropagation()}>
            <h2>Add: {form.slots[chooserFor].label}</h2>
            <button type="button" className="sg-option" onClick={() => pick(galleryInput, chooserFor)}>
              💻 Upload from your device<small>Pick a photo file</small>
            </button>
            <button type="button" className="sg-option" onClick={() => pick(cameraInput, chooserFor)}>
              📷 Take a photo<small>Opens the camera on phones and tablets</small>
            </button>
            <button type="button" className="link sg-cancel" onClick={() => setChooserFor(null)}>Cancel</button>
          </div>
        </div>
      )}

      <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={onFilesChosen} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFilesChosen} />
    </>
  );
}
