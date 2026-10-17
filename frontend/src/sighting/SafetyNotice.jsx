// Shown once, before someone's first report.
export default function SafetyNotice({ onOk }) {
  return (
    <div className="sg-overlay" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div className="sg-modal">
        <div className="sg-modal-emoji">🦺</div>
        <h2 id="safety-title">Before your first report</h2>
        <ul className="sg-safety">
          <li>🙅 <b>Don't touch or move</b> the scooter</li>
          <li>🗣️ <b>Don't confront</b> anyone</li>
          <li>🚨 Theft happening right now? <b>Call 911</b></li>
          <li>🙂 Keep people's faces out of photos</li>
        </ul>
        <button type="button" className="sg-full" onClick={onOk} autoFocus>Got it, let's go</button>
      </div>
    </div>
  );
}
