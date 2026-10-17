import { Link } from "react-router-dom";

// Feature 2: Submit a sighting (the spotter's side).
export default function SubmitSighting() {
  return (
    <main className="page narrow">
      <Link to="/">← Home</Link>
      <h1>📸 Report a sighting</h1>
      <p className="muted">Coming soon: 2+ photos, a map pin, and optional brand and color.</p>
    </main>
  );
}
