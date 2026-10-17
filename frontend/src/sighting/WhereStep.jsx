import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CAMPUS_CENTER, LANDMARKS } from "./constants.js";
import { isOffCampus, nearestLandmark, timeToday } from "./helpers.js";
import { pinIcon } from "./pinIcon.js";

const GPS_ERRORS = {
  1: "This browser isn't allowed to share your location. Pick a landmark or click the map instead.",
  2: "Couldn't find your location. Pick a landmark or click the map instead.",
  3: "Finding your location took too long. Pick a landmark or click the map instead.",
};
const PERMISSION_DENIED = 1;

// Shown under a "permission denied" error, since the fix is in browser or computer settings.
function HowToAllowLocation() {
  return (
    <details className="sg-help">
      <summary>How do I turn location on?</summary>
      <ol>
        <li>Click the icon at the left end of the address bar (🔒 or ⓘ), set <b>Location</b> to <b>Allow</b>, then reload the page.</li>
        <li>On a Mac, also check <b>System Settings → Privacy &amp; Security → Location Services</b> and turn it on for your browser.</li>
        <li>Some built-in or embedded browsers never share location. Open the site in Chrome, Safari or Firefox instead.</li>
      </ol>
    </details>
  );
}

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

// Move the map when the location comes from GPS or a landmark (not when clicking, to avoid jumps).
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export default function WhereStep({ form, update, onNext, onBack }) {
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [gpsDenied, setGpsDenied] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [earlier, setEarlier] = useState(Boolean(form.seenTime));

  function placePin(latlng, source) {
    const loc = { lat: Number(latlng.lat.toFixed(6)), lng: Number(latlng.lng.toFixed(6)) };
    update({ loc, landmark: nearestLandmark(loc), locSource: source, accuracy: null });
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setGpsError(GPS_ERRORS[2]); return; }
    setGpsError("");
    setGpsDenied(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) };
        update({ loc, landmark: nearestLandmark(loc), locSource: "gps", accuracy: Math.round(pos.coords.accuracy) });
        setFlyTarget(loc);
        setLocating(false);
      },
      (err) => {
        setGpsError(GPS_ERRORS[err.code] ?? GPS_ERRORS[2]);
        setGpsDenied(err.code === PERMISSION_DENIED);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function pickLandmark(landmark) {
    const loc = { lat: landmark.lat, lng: landmark.lng };
    update({ loc, landmark: landmark.name, locSource: "landmark", accuracy: null });
    setFlyTarget(loc);
    setGpsError("");
    setGpsDenied(false);
  }

  const seen = timeToday(form.seenTime);
  const futureTime = seen && seen > new Date();

  return (
    <>
      <div className="sg-body">
        <h2>Where did you see it?</h2>
        <p className="muted">Use your location, click the map, or pick a landmark.</p>

        <div className="sg-where">
          <div>
            <MapContainer center={form.loc ? [form.loc.lat, form.loc.lng] : CAMPUS_CENTER} zoom={form.loc ? 17 : 15} className="sg-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickToPlace onPick={(latlng) => placePin(latlng, "map")} />
              <FlyTo target={flyTarget} />
              {form.loc && form.accuracy && <Circle center={[form.loc.lat, form.loc.lng]} radius={form.accuracy} pathOptions={{ weight: 1 }} />}
              {form.loc && (
                <Marker
                  position={[form.loc.lat, form.loc.lng]}
                  icon={pinIcon}
                  draggable
                  eventHandlers={{ dragend: (e) => placePin(e.target.getLatLng(), "map") }}
                />
              )}
            </MapContainer>
            <p className="sg-locline">
              {form.loc ? (
                <>📍 {form.landmark ? <>Near <b>{form.landmark}</b></> : <b>Custom spot</b>}{" "}
                  <span className="muted">· {form.loc.lat.toFixed(5)}, {form.loc.lng.toFixed(5)}{form.accuracy ? ` · ±${form.accuracy} m` : ""}</span></>
              ) : (
                <span className="muted">🖱️ Click the map to drop a pin. You can drag it afterwards.</span>
              )}
            </p>
            {form.loc && isOffCampus(form.loc) && (
              <p className="sg-warn">🤔 This looks <b>far from campus</b>. Is that right? Drag the pin if not.</p>
            )}
          </div>

          <div>
            <button type="button" className="sg-gps" onClick={useMyLocation} disabled={locating}>
              {locating ? "⏳ Finding you…" : "📍 Use my location"}
            </button>
            {gpsError && <p className="error sg-gap">🚫 {gpsError}</p>}
            {gpsDenied && <HowToAllowLocation />}

            <div className="sg-field">
              <span className="sg-label">Or pick a landmark</span>
              <div className="sg-chips">
                {LANDMARKS.map((l) => (
                  <button
                    key={l.name}
                    type="button"
                    className={`sg-chip ${form.locSource === "landmark" && form.landmark === l.name ? "on" : ""}`}
                    onClick={() => pickLandmark(l)}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sg-field">
              <span className="sg-label">When?</span>
              {earlier ? (
                <div className="sg-when">
                  🕑 Today at{" "}
                  <input type="time" value={form.seenTime} onChange={(e) => update({ seenTime: e.target.value })} aria-label="Time you saw it" />
                  <button type="button" className="link" onClick={() => { setEarlier(false); update({ seenTime: "" }); }}>Just now</button>
                </div>
              ) : (
                <div className="sg-when">
                  🕑 <b>Just now</b> · <button type="button" className="link" onClick={() => setEarlier(true)}>I saw it earlier</button>
                </div>
              )}
              {futureTime && <p className="error sg-gap">That time hasn't happened yet today.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="sg-actions">
        <button type="button" className="sg-ghost" onClick={onBack}>← Back</button>
        <span className="sg-spacer" />
        <button type="button" onClick={onNext} disabled={!form.loc || futureTime}>Next →</button>
      </div>
    </>
  );
}
