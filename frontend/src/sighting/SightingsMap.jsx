import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CAMPUS_CENTER, LANDMARKS } from "./constants.js";
import { myPinIcon, pinIcon } from "./pinIcon.js";
import SightingSummary from "./SightingSummary.jsx";

// Moves the map: fits all visible pins when the filters change, flies to a picked landmark,
// and opens a pin's popup when it's chosen from the list (even if it's inside a bubble).
function MapController({ sightings, fitKey, landmark, selected, markers, cluster }) {
  const map = useMap();

  useEffect(() => {
    const spot = LANDMARKS.find((l) => l.name === landmark);
    if (spot) {
      map.flyTo([spot.lat, spot.lng], 17, { duration: 0.6 });
    } else if (sightings.length > 0) {
      map.fitBounds(L.latLngBounds(sightings.map((s) => [s.lat, s.lng])), { padding: [40, 40], maxZoom: 17 });
    }
    // Only re-fit when the filters change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    if (selected.from !== "list") return; // clicking a pin opens its own popup
    const marker = markers.current.get(selected.id);
    if (marker && cluster.current) cluster.current.zoomToShowLayer(marker, () => marker.openPopup());
  }, [selected, markers, cluster]);

  return null;
}

export default function SightingsMap({ sightings, fitKey, landmark, selected, onSelect }) {
  const markers = useRef(new Map()); // sighting id -> Leaflet marker
  const cluster = useRef(null);

  return (
    <MapContainer center={CAMPUS_CENTER} zoom={15} className="sg-viewmap">
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
            eventHandlers={{ click: () => onSelect(s.id, "map") }}
          >
            <Popup maxWidth={260}>
              <SightingSummary sighting={s} />
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      <MapController sightings={sightings} fitKey={fitKey} landmark={landmark} selected={selected} markers={markers} cluster={cluster} />
    </MapContainer>
  );
}
