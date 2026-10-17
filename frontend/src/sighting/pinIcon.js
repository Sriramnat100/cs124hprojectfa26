import L from "leaflet";

// CSS pins instead of Leaflet's default image marker, which doesn't load with Vite out of the box.
// Lives in its own file so the map components keep live-reloading while you edit them.
export const pinIcon = L.divIcon({ className: "sg-pin", html: "<span></span>", iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -38] });

// Blue pin for sightings the logged-in user reported (View sightings map).
export const myPinIcon = L.divIcon({ className: "sg-pin mine", html: "<span></span>", iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -38] });
