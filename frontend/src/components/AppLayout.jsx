import { Outlet } from "react-router-dom";
import NavBar from "./NavBar.jsx";

// Every page: the glass nav bar on top, then the page itself.
export default function AppLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
