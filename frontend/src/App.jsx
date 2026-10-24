import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Matches from "./pages/Matches.jsx";
import MyScooters from "./pages/MyScooters.jsx";
import MySightings from "./pages/MySightings.jsx";
import RegisterScooter from "./pages/RegisterScooter.jsx";
import ScooterDetail from "./pages/ScooterDetail.jsx";
import Settings from "./pages/Settings.jsx";
import SubmitSighting from "./pages/SubmitSighting.jsx";
import TheftMap from "./pages/TheftMap.jsx";
import ViewSightings from "./pages/ViewSightings.jsx";

// The 3D home page loads three.js, so it's only downloaded when you visit it.
const Landing = lazy(() => import("./landing/Landing.jsx"));

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
      {/* Every page shares the glass nav bar */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Suspense fallback={<p className="page muted">Loading…</p>}><Landing /></Suspense>} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-scooters" element={<RequireLogin><MyScooters /></RequireLogin>} />
        <Route path="/register-scooter" element={<RequireLogin><RegisterScooter /></RequireLogin>} />
        <Route path="/scooters/:id" element={<RequireLogin><ScooterDetail /></RequireLogin>} />
        <Route path="/scooters/:id/edit" element={<RequireLogin><RegisterScooter /></RequireLogin>} />
        <Route path="/submit-sighting" element={<RequireLogin><SubmitSighting /></RequireLogin>} />
        <Route path="/my-sightings" element={<RequireLogin><MySightings /></RequireLogin>} />
        <Route path="/view-sightings" element={<RequireLogin><ViewSightings /></RequireLogin>} />
        <Route path="/matches" element={<RequireLogin><Matches /></RequireLogin>} />
        <Route path="/theft-map" element={<RequireLogin><TheftMap /></RequireLogin>} />
        <Route path="/settings" element={<RequireLogin><Settings /></RequireLogin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
