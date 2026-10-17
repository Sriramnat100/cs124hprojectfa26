export const STEPS = [
  { id: "photos", name: "Photos", hint: "2–5 angles" },
  { id: "where", name: "Where & when", hint: "map or landmark" },
  { id: "details", name: "Details", hint: "optional" },
  { id: "review", name: "Review", hint: "check & submit" },
];

// Sidebar on wide screens, a progress bar on phones (see sighting.css).
export default function Stepper({ current, canOpen, onOpen }) {
  const index = STEPS.findIndex((s) => s.id === current);

  return (
    <>
      <nav className="sg-stepper" aria-label="Report steps">
        {STEPS.map((step, i) => {
          const done = i < index;
          const clickable = i !== index && canOpen(step.id);
          return (
            <button
              key={step.id}
              type="button"
              className={`sg-step ${i === index ? "current" : ""} ${done ? "done" : ""}`}
              disabled={!clickable}
              onClick={() => onOpen(step.id)}
              aria-current={i === index ? "step" : undefined}
            >
              <span className="sg-step-num">{done ? "✓" : i + 1}</span>
              <span>
                {step.name}
                <small>{step.hint}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sg-progress" aria-hidden="true">
        <div className="sg-bars">
          {STEPS.map((s, i) => <span key={s.id} className={i <= index ? "on" : ""} />)}
        </div>
        <small>Step {index + 1} of {STEPS.length} · {STEPS[index].name}</small>
      </div>
    </>
  );
}
