import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Link } from "react-router-dom";
import { CAMPUS_CENTER } from "../sighting/constants.js";
import { myPinIcon, pinIcon } from "../sighting/pinIcon.js";
import SightingSummary from "../sighting/SightingSummary.jsx";

// The same Leaflet map as Explore Map (dark tiles, red/blue pins, numbered bubbles,
// photo popups). It sits behind the home page and only accepts input in the map section.
function Controller({ active, selection, markers, cluster, onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);

  useEffect(() => {
    const handlers = [map.dragging, map.doubleClickZoom, map.boxZoom, map.keyboard, map.touchZoom];
    handlers.forEach((h) => (active ? h.enable() : h.disable()));
    map.scrollWheelZoom.disable(); // the mouse wheel always scrolls the page
    if (!active) map.closePopup();
  }, [active, map]);

  // Open a sighting chosen from the side panel, even if it's inside a bubble.
  useEffect(() => {
    if (!selection) return;
    const marker = markers.current.get(selection.id);
    if (marker && cluster.current) cluster.current.zoomToShowLayer(marker, () => marker.openPopup());
  }, [selection, markers, cluster]);
  return null;
}

export default function LandingMap({ sightings, active, selection, loggedIn, onReady }) {
  const markers = useRef(new Map());
  const cluster = useRef(null);

  return (
    <div className={`lp-bgmap ${active ? "lp-map-active" : ""}`}>
      <div className="lp-mapplane">
        <MapContainer center={CAMPUS_CENTER} zoom={16} className="lp-leaflet" scrollWheelZoom={false} dragging={false} zoomControl={false} attributionControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup ref={cluster} chunkedLoading showCoverageOnHover={false}>
            {sightings.map((s) => (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={s.mine ? myPinIcon : pinIcon}
                ref={(m) => (m ? markers.current.set(s.id, m) : markers.current.delete(s.id))}
              >
                <Popup maxWidth={260}>
                  <SightingSummary sighting={s} />
                  {s.sample
                    ? <p className="lp-popup-note">Example sighting. <Link to="/login">Log in</Link> for live data.</p>
                    : <p className="lp-popup-note"><Link to="/view-sightings">Open in Explore Map →</Link></p>}
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
          <Controller active={active} selection={selection} markers={markers} cluster={cluster} onReady={onReady} />
        </MapContainer>
      </div>
      {!loggedIn && <span className="lp-map-badge">Example data</span>}
    </div>
  );
}
