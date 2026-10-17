import { Link } from "react-router-dom";

// Feature 1: Register a scooter (the owner's side).
export default function RegisterScooter() {
  return (
    <main className="page narrow">
      <Link to="/">← Home</Link>
      <h1>🛴 Register my scooter</h1>
      <p className="muted">Coming soon: brand, model, color, serial number, marks, and 2+ photos.</p>
    </main>
  );
}
