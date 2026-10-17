import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
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
      await (isSignup ? signup(email, password) : login(email, password));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page narrow">
      <h1>🛴 ScooterTrace</h1>
      <p className="muted">{isSignup ? "Create an account" : "Log in to continue"}</p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Illinois email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="netid@illinois.edu" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            minLength={isSignup ? 8 : undefined} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{isSignup ? "Sign up" : "Log in"}</button>
      </form>

      <button className="link" onClick={() => { setIsSignup(!isSignup); setError(""); }}>
        {isSignup ? "Already have an account? Log in" : "New here? Sign up"}
      </button>
    </main>
  );
}
