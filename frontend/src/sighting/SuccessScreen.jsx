import { Link } from "react-router-dom";

const CONFETTI = ["🎉", "✨", "🛴", "⭐", "🎊", "💚", "🎉"];

export default function SuccessScreen({ points, onAgain }) {
  return (
    <div className="sg-success">
      {CONFETTI.map((e, i) => (
        <span key={i} className="sg-confetti" style={{ left: `${8 + i * 13}%`, animationDelay: `${i * 0.08}s` }} aria-hidden="true">{e}</span>
      ))}
      <div className="sg-check" aria-hidden="true">✓</div>
      <h2>Submitted!</h2>
      <p className="muted">You're helping keep campus scooters safe 🛴</p>
      <div className="sg-plus">+10 pts</div>
      <p className="muted">You now have <b>{points}</b> points. <Link to="/points">See the leaderboard</Link></p>
      <p className="sg-tip">🔔 If this matches a stolen scooter, the owner gets notified. Your name is never shown to them.</p>
      <div className="sg-row sg-center">
        <Link to="/" className="sg-btnlink ghost">Home</Link>
        <Link to="/my-sightings" className="sg-btnlink ghost">My sightings</Link>
        <button type="button" onClick={onAgain}>📸 Report another</button>
      </div>
    </div>
  );
}
