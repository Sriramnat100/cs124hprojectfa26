import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

// Log in, or create an account with an @illinois.edu email (the backend checks both).
export default function Login() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false); // false: log in, true: create an account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await (creating ? signup : login)(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setCreating(!creating);
    setError("");
  }

  return (
    <main className="page narrow">
      <h1>🛴 ScooterTrace</h1>
      <p className="muted">{creating ? "Create an account with your @illinois.edu email" : "Log in to report and track scooters"}</p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="netid@illinois.edu"
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={creating ? "At least 8 characters" : ""}
            autoComplete={creating ? "new-password" : "current-password"}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{creating ? "Create account" : "Log in"}</button>
      </form>

      <p className="muted">
        {creating ? "Already have an account? " : "New here? "}
        <button type="button" className="link" onClick={switchMode}>{creating ? "Log in" : "Create an account"}</button>
      </p>
    </main>
  );
}
