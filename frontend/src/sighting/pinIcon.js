import L from "leaflet";

// A CSS pin instead of Leaflet's default image marker, which doesn't load with Vite out of the box.
// Lives in its own file so the map components keep live-reloading while you edit them.
export const pinIcon = L.divIcon({ className: "sg-pin", html: "<span></span>", iconSize: [30, 42], iconAnchor: [15, 42] });
