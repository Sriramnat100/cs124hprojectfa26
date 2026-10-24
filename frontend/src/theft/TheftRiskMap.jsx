import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat"; // adds L.heatLayer (needs leaflet imported first)
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { CAMPUS_CENTER } from "../sighting/constants.js";
import { formatDate } from "./format.js";

const theftPin = L.divIcon({ className: "theft-pin", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -8] });

// Yellow -> orange -> dark red as thefts pile up.
const HEAT_OPTIONS = {
  radius: 30,
  blur: 24,
  maxZoom: 16,
  minOpacity: 0.35,
  gradient: { 0.3: "#fde047", 0.55: "#fb923c", 0.8: "#ef4444", 1: "#7f1d1d" },
};

// Leaflet.heat isn't a react-leaflet component, so add/remove it on the map by hand.
function HeatLayer({ incidents }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(incidents.map((i) => [i.lat, i.lng, 1]), HEAT_OPTIONS).addTo(map);
    return () => layer.remove();
  }, [map, incidents]);
  return null;
}

// Fits the map to the data when it changes, and flies to a hotspot picked from the list.
function MapController({ incidents, selected, circles }) {
  const map = useMap();

  useEffect(() => {
    if (incidents.length > 0) {
      map.fitBounds(L.latLngBounds(incidents.map((i) => [i.lat, i.lng])), { padding: [40, 40], maxZoom: 16 });
    }
  }, [map, incidents]);

  useEffect(() => {
    if (!selected) return;
    map.flyTo([selected.lat, selected.lng], 17, { duration: 0.6 });
    const circle = circles.current.get(selected.id);
    if (circle) map.once("moveend", () => circle.openPopup());
  }, [map, selected, circles]);

  return null;
}

export default function TheftRiskMap({ incidents, hotspots, mode, labels, selected, onSelectHotspot }) {
  const circles = useRef(new Map()); // hotspot id -> Leaflet circle

  return (
    <MapContainer center={CAMPUS_CENTER} zoom={15} className="theft-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {mode === "heat" && (
        <>
          <HeatLayer incidents={incidents} />
          {/* The heat itself can't be clicked, so each hotspot also gets an (almost invisible) circle. */}
          {hotspots.map((h) => (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={12 + 5 * Math.sqrt(h.count)}
              pathOptions={{ color: "#7f1d1d", weight: 1, dashArray: "3 4", fillColor: "#7f1d1d", fillOpacity: 0.04 }}
              ref={(c) => (c ? circles.current.set(h.id, c) : circles.current.delete(h.id))}
              eventHandlers={{ click: () => onSelectHotspot(h.id) }}
            >
              {h.count > 1 && (
                <Tooltip permanent direction="center" className="theft-count">{h.count}</Tooltip>
              )}
              <Popup maxWidth={280}>
                <HotspotSummary hotspot={h} labels={labels} />
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}

      {mode === "pins" && (
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
          {incidents.map((i) => (
            <Marker key={i.id} position={[i.lat, i.lng]} icon={theftPin}>
              <Popup maxWidth={280}>
                <IncidentSummary incident={i} labels={labels} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      <MapController incidents={incidents} selected={mode === "heat" ? selected : null} circles={circles} />
    </MapContainer>
  );
}

export function HotspotSummary({ hotspot, labels }) {
  return (
    <div className="theft-summary">
      <b>{hotspot.count} theft{hotspot.count === 1 ? "" : "s"} in this area</b>
      <span className="muted">Most recent: {formatDate(hotspot.latest_date)}</span>
      <span className="theft-sublabel">Top locations</span>
      <ol>
        {hotspot.top_locations.map((t) => (
          <li key={t.name}>{t.name} <span className="muted">× {t.count}</span></li>
        ))}
      </ol>
      <span className="muted">
        {Object.entries(hotspot.categories).map(([c, n]) => `${n} ${labels[c]?.toLowerCase() ?? c}`).join(" · ")}
      </span>
    </div>
  );
}

function IncidentSummary({ incident: i, labels }) {
  return (
    <div className="theft-summary">
      <b>{i.place_name || i.street_address}</b>
      {i.place_name && i.street_address && <span className="muted">{i.street_address}</span>}
      <span>{labels[i.category]} · {i.description}</span>
      <span className="muted">Reported {formatDate(i.reported_date)}{i.sub_location ? ` · ${i.sub_location}` : ""}</span>
      {i.approximate && <span className="muted">📍 Approximate: only the street was found</span>}
      <span className="muted">Case {i.case_number} · {i.disposition}</span>
    </div>
  );
}
