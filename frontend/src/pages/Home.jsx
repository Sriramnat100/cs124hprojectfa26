import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Home() {
  const { user, logout } = useAuth();
  const [points, setPoints] = useState(null);

  // Points: 10 for every sighting you've reported (Feature 2).
  useEffect(() => {
    api("/sightings/points").then((d) => setPoints(d.points)).catch(() => {});
  }, []);

  return (
    <main className="page narrow">
      <header className="topbar">
        <h1>🛴 ScooterTrace</h1>
        <button className="link" onClick={logout}>Log out</button>
      </header>
      <p className="muted">
        Logged in as {user.email}
        {points !== null && <> · <Link to="/my-sightings" className="points">🏆 {points} points</Link></>}
      </p>

      <div className="tiles">
        <Link to="/register-scooter" className="tile">
          <span className="emoji">🛴</span>
          <b>Register my scooter</b>
          <small>Add your scooter so it can be found if it's stolen</small>
        </Link>
        <Link to="/submit-sighting" className="tile">
          <span className="emoji">📸</span>
          <b>Report a sighting</b>
          <small>Photograph a scooter you saw on campus · +10 points</small>
        </Link>
        <Link to="/my-sightings" className="tile">
          <span className="emoji">📋</span>
          <b>My sightings</b>
          <small>See what you've reported{points !== null ? ` · ${points / 10} so far` : ""}</small>
        </Link>
      </div>
    </main>
  );
}
