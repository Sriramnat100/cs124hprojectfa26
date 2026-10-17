import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Matches from "./pages/Matches.jsx";
import MyScooters from "./pages/MyScooters.jsx";
import MySightings from "./pages/MySightings.jsx";
import RegisterScooter from "./pages/RegisterScooter.jsx";
import ScooterDetail from "./pages/ScooterDetail.jsx";
import SubmitSighting from "./pages/SubmitSighting.jsx";
import ViewSightings from "./pages/ViewSightings.jsx";

// Wrap a page in <RequireLogin> to send logged-out users to /login.
function RequireLogin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireLogin><Home /></RequireLogin>} />
      <Route path="/my-scooters" element={<RequireLogin><MyScooters /></RequireLogin>} />
      <Route path="/register-scooter" element={<RequireLogin><RegisterScooter /></RequireLogin>} />
      <Route path="/scooters/:id" element={<RequireLogin><ScooterDetail /></RequireLogin>} />
      <Route path="/scooters/:id/edit" element={<RequireLogin><RegisterScooter /></RequireLogin>} />
      <Route path="/submit-sighting" element={<RequireLogin><SubmitSighting /></RequireLogin>} />
      <Route path="/my-sightings" element={<RequireLogin><MySightings /></RequireLogin>} />
      <Route path="/view-sightings" element={<RequireLogin><ViewSightings /></RequireLogin>} />
      <Route path="/matches" element={<RequireLogin><Matches /></RequireLogin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
