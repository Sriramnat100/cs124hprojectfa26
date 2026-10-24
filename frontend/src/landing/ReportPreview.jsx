import { useState } from "react";
import { Link } from "react-router-dom";

// Home page: an interactive preview of the 4-step Report a sighting flow.
const STEPS = [
  { name: "Photos", title: "Snap two angles", text: "A side view and a front or back view. Photos are shrunk in the browser so uploads are quick." },
  { name: "Where", title: "Drop a pin", text: "Use your location, tap the map, or pick a building like Grainger with one tap." },
  { name: "Details", title: "Add what you noticed", text: "Brand, color, stickers or scratches. Every detail is optional, and “Not sure” is fine." },
  { name: "Review", title: "Check and send", text: "Everything on one screen, with edit links. Submit to earn 10 points." },
];

const Sketch = () => (
  <svg viewBox="0 0 120 72" fill="none" stroke="#8FA3BF" strokeWidth="3" strokeLinecap="round"><path d="M34 58l30-46h12" /><path d="M22 58h70" /><circle cx="22" cy="58" r="9" /><circle cx="94" cy="58" r="9" /></svg>
);

function Preview({ step }) {
  if (step === 0) {
    return (
      <div className="lp-rp-photos">
        <div className="lp-rp-slot filled"><Sketch /><span>Side view</span></div>
        <div className="lp-rp-slot filled lp-rp-flip"><Sketch /><span>Front or back</span></div>
        <div className="lp-rp-slot"><b>＋</b><span>Close-up</span></div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="lp-rp-where">
        <svg viewBox="0 0 300 130" className="lp-rp-map" aria-hidden="true">
          <rect width="300" height="130" rx="12" fill="#0E1828" />
          <path d="M0 52H300M0 98H300M96 0V130M204 0V130" stroke="#1C2C47" strokeWidth="8" />
          <rect x="112" y="16" width="76" height="26" rx="5" fill="#1E3A4E" />
          <rect x="18" y="62" width="62" height="26" rx="5" fill="#1B2A46" />
          <rect x="220" y="62" width="62" height="26" rx="5" fill="#1B2A46" />
          <g transform="translate(150 40)"><path d="M0 0 C-9 -12 -11 -17 -11 -23 A11 11 0 1 1 11 -23 C11 -17 9 -12 0 0Z" fill="#D83A3A" stroke="#fff" strokeWidth="2" /><circle cy="-23" r="4" fill="#fff" /></g>
        </svg>
        <div className="lp-rp-chips"><span className="on">Grainger</span><span>Union</span><span>ECEB</span><span className="lp-rp-gps">📍 My location</span></div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="lp-rp-details">
        <div className="lp-rp-chips"><span className="on">Segway</span><span>Xiaomi</span><span>Gotrax</span><span>Not sure</span></div>
        <div className="lp-rp-colors">{["#1d1d1f", "#f4f4f4", "#9097a3", "#d83a3a", "#2f6fdb"].map((c, i) => <i key={c} className={i === 0 ? "on" : ""} style={{ background: c }} />)}</div>
        <div className="lp-rp-chips"><span className="on">🏷️ Sticker</span><span>〰️ Scratches</span><span>🧺 Basket</span></div>
      </div>
    );
  }
  return (
    <div className="lp-rp-review">
      <div className="lp-rp-thumbs"><div><Sketch /></div><div className="lp-rp-flip"><Sketch /></div></div>
      <div className="lp-rp-summary">
        <b>Black Segway · near Grainger</b>
        <span>Just now · Sticker · Locked to a rack</span>
      </div>
      <div className="lp-rp-submit"><span>✓ Submit sighting</span><em>+10 pts</em></div>
    </div>
  );
}

export default function ReportPreview({ loggedIn }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  return (
    <div className="lp-rp" aria-label="Preview of reporting a sighting">
      <div className="lp-rp-tabs" role="tablist">
        {STEPS.map((x, i) => (
          <button key={x.name} type="button" role="tab" aria-selected={i === step} className={i === step ? "on" : i < step ? "done" : ""} onClick={() => setStep(i)}>
            <span>{i < step ? "✓" : i + 1}</span>{x.name}
          </button>
        ))}
      </div>
      <div className="lp-rp-body" role="tabpanel" key={step}>
        <Preview step={step} />
        <h3>{s.title}</h3>
        <p>{s.text}</p>
      </div>
      <div className="lp-rp-foot">
        <button type="button" className="lp-rp-next" onClick={() => setStep((step + 1) % STEPS.length)}>
          {step === STEPS.length - 1 ? "↺ See it again" : "Next step →"}
        </button>
        <Link className="lp-btn lp-btn-primary lp-rp-cta" to={loggedIn ? "/submit-sighting" : "/login"}>{loggedIn ? "Start a Report" : "Log in to Report"}</Link>
      </div>
    </div>
  );
}
