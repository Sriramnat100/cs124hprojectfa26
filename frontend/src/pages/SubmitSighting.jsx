import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import DetailsStep from "../sighting/DetailsStep.jsx";
import PhotosStep from "../sighting/PhotosStep.jsx";
import ReviewStep from "../sighting/ReviewStep.jsx";
import SafetyNotice from "../sighting/SafetyNotice.jsx";
import Stepper from "../sighting/Stepper.jsx";
import SuccessScreen from "../sighting/SuccessScreen.jsx";
import WhereStep from "../sighting/WhereStep.jsx";
import { GUIDED_SLOTS, MIN_PHOTOS } from "../sighting/constants.js";
import { formatWhen, readJSON, writeJSON } from "../sighting/helpers.js";
import "../sighting/sighting.css";

// Feature 2: Submit a sighting (the spotter's side).
// The current step lives in the URL (?step=where) so the browser's Back button works.

function emptyForm() {
  return {
    slots: GUIDED_SLOTS.map((s) => ({ ...s, dataUrl: null })),
    loc: null, landmark: null, locSource: null, accuracy: null, seenTime: "",
    brand: null, color: null, features: [], situation: null, notes: "",
  };
}

const photoCount = (form) => form.slots.filter((s) => s.dataUrl).length;
const hasData = (form) => photoCount(form) > 0 || form.loc || form.brand || form.color || form.features.length > 0 || form.notes;

function draftSummary(draft) {
  const n = photoCount(draft.form);
  return `(${formatWhen(draft.savedAt)}, ${n} photo${n === 1 ? "" : "s"}${draft.form.landmark ? `, near ${draft.form.landmark}` : ""})`;
}

export default function SubmitSighting() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const draftKey = `sightingDraft:${user.id}`;
  const safetyKey = `safetySeen:${user.id}`;

  const [form, setForm] = useState(emptyForm);
  const [draft, setDraft] = useState(() => readJSON(draftKey));
  const [showSafety, setShowSafety] = useState(() => !readJSON(safetyKey));
  const [points, setPoints] = useState(null); // set after a successful submit

  const update = (changes) => setForm((f) => ({ ...f, ...changes }));

  // Save a draft whenever the form changes, so closing the tab doesn't lose the report.
  useEffect(() => {
    if (!hasData(form)) return;
    const savedAt = new Date().toISOString();
    // If photos don't fit in localStorage, keep everything else.
    if (!writeJSON(draftKey, { savedAt, form })) {
      writeJSON(draftKey, { savedAt, form: { ...form, slots: form.slots.map((s) => ({ ...s, dataUrl: null })) } });
    }
  }, [form, draftKey]);

  // Which steps can be opened right now. Refreshing on a later step with an empty form goes back.
  const canOpen = (step) => {
    if (step === "photos") return true;
    if (step === "where") return photoCount(form) >= MIN_PHOTOS;
    if (step === "done") return points !== null;
    return photoCount(form) >= MIN_PHOTOS && Boolean(form.loc);
  };
  const requested = params.get("step") || "photos";
  const step = canOpen(requested) ? requested : photoCount(form) < MIN_PHOTOS ? "photos" : "where";

  useEffect(() => {
    if (step !== requested) setParams(step === "photos" ? {} : { step }, { replace: true });
  }, [step, requested, setParams]);

  // Clear the form only once the thank-you screen is showing. Clearing it any earlier would
  // briefly leave the Review step with an empty form, which redirects back to Photos.
  useEffect(() => {
    if (step === "done") setForm(emptyForm());
  }, [step]);

  function goTo(next) {
    setParams(next === "photos" ? {} : { step: next });
    window.scrollTo(0, 0);
  }

  function continueDraft() {
    setForm({ ...emptyForm(), ...draft.form });
    setDraft(null);
  }

  function discardDraft() {
    localStorage.removeItem(draftKey);
    setDraft(null);
  }

  function submitted(result) {
    localStorage.removeItem(draftKey);
    setDraft(null);
    setPoints(result.points);
    setParams({ step: "done" });
    window.scrollTo(0, 0);
  }

  function reportAnother() {
    setPoints(null);
    goTo("photos");
  }

  if (step === "done") {
    return (
      <main className="page sg-page">
        <SuccessScreen points={points} onAgain={reportAnother} />
      </main>
    );
  }

  const shared = { form, update };
  return (
    <main className="page sg-page">
      <Link to="/">← Home</Link>
      <h1 className="sg-title">📸 Report a sighting</h1>

      <div className="sg-layout">
        <Stepper current={step} canOpen={canOpen} onOpen={goTo} />
        <section className="sg-card">
          {step === "photos" && (
            <PhotosStep
              {...shared}
              onNext={() => goTo("where")}
              onCancel={() => navigate("/")}
              draft={draft && !hasData(form) ? { summary: draftSummary(draft) } : null}
              onContinueDraft={continueDraft}
              onDiscardDraft={discardDraft}
            />
          )}
          {step === "where" && <WhereStep {...shared} onNext={() => goTo("details")} onBack={() => goTo("photos")} />}
          {step === "details" && <DetailsStep {...shared} onNext={() => goTo("review")} onBack={() => goTo("where")} />}
          {step === "review" && <ReviewStep form={form} onEdit={goTo} onBack={() => goTo("details")} onSubmitted={submitted} />}
        </section>
      </div>

      {showSafety && <SafetyNotice onOk={() => { writeJSON(safetyKey, true); setShowSafety(false); }} />}
    </main>
  );
}
