import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main className="page narrow">
      <header className="topbar">
        <h1>🛴 ScooterTrace</h1>
        <button className="link" onClick={logout}>Log out</button>
      </header>
      <p className="muted">Logged in as {user.email}</p>

      <div className="tiles">
        <Link to="/register-scooter" className="tile">
          <span className="emoji">🛴</span>
          <b>Register my scooter</b>
          <small>Add your scooter so it can be found if it's stolen</small>
        </Link>
        <Link to="/submit-sighting" className="tile">
          <span className="emoji">📸</span>
          <b>Report a sighting</b>
          <small>Photograph a scooter you saw on campus</small>
        </Link>
      </div>
    </main>
  );
}
