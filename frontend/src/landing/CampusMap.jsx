import { useEffect, useMemo, useRef } from "react";
import { LANDMARKS } from "../sighting/constants.js";

// A stylized campus map drawn as SVG. Real latitude/longitude is projected onto it,
// so buildings and sightings appear where they really are.
const W = 1600, H = 1000;
const BOUNDS = { north: 40.1165, south: 40.103, west: -88.2391, east: -88.2109 };
export const KIND_COLORS = { sighting: "#3CD6C4", mine: "#7DD3FC", sample: "#8FA3BF" };

export function project(lat, lng) {
  return {
    x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
    y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H,
  };
}
const inMap = ({ x, y }) => x >= 0 && x <= W && y >= 0 && y <= H;

// Streets: [name, latitude or longitude, major?]
const ROADS_EW = [["University Ave", 40.1162, false], ["Springfield Ave", 40.1118, true], ["Green St", 40.1101, true], ["Gregory Dr", 40.106, false], ["Armory Ave", 40.104, true]];
const ROADS_NS = [["Fourth St", -88.2346, false], ["Sixth St", -88.2318, false], ["Wright St", -88.2287, true], ["Mathews Ave", -88.2257, false], ["Goodwin Ave", -88.2232, true], ["Lincoln Ave", -88.2196, true]];
// Green quads: [label, north, south, west, east]
const QUADS = [["Bardeen Quad", 40.1145, 40.1124, -88.2284, -88.2261], ["Main Quad", 40.1095, 40.1063, -88.2283, -88.2262]];
// Extra buildings so the map feels like a campus: [lat, lng, width, height]
const FILLER = [[40.1152, -88.2335, 120, 70], [40.1135, -88.2205, 110, 80], [40.1086, -88.2335, 140, 70], [40.1074, -88.2245, 90, 60], [40.1055, -88.2205, 130, 70], [40.1112, -88.2358, 100, 60], [40.1048, -88.2335, 120, 60], [40.1154, -88.2215, 100, 60]];

function Building({ x, y, w, h, highlight }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2 + 12} width={w} height={h} rx="8" fill="#0E182B" />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="8" fill={highlight ? "#1E3A4E" : "#1B2A46"} stroke={highlight ? "#2C6070" : "#25395C"} />
    </g>
  );
}

function StaticMap() {
  return (
    <>
      <defs>
        <pattern id="lp-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#132036" strokeWidth="1" /></pattern>
      </defs>
      <rect width={W} height={H} fill="#0B1424" />
      <rect width={W} height={H} fill="url(#lp-grid)" />
      {QUADS.map(([name, n, s, w, e]) => {
        const a = project(n, w), b = project(s, e);
        return (
          <g key={name}>
            <rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} rx="16" fill="#0F2A26" stroke="#164038" strokeWidth="2" />
            <text x={(a.x + b.x) / 2} y={b.y - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#2F6B5E" letterSpacing="1.5">{name.toUpperCase()}</text>
          </g>
        );
      })}
      <path d="M0 300 C220 280 380 340 560 318 S900 290 1080 320 1380 350 1600 332" fill="none" stroke="#123048" strokeWidth="10" strokeLinecap="round" />
      {ROADS_EW.map(([name, lat, major]) => {
        const y = project(lat, BOUNDS.west).y;
        return (
          <g key={name}>
            <line x1="0" y1={y} x2={W} y2={y} stroke={major ? "#1C2C47" : "#16243C"} strokeWidth={major ? 18 : 9} strokeLinecap="round" />
            <text x="24" y={y - 14} fontSize="12" fontWeight="600" fill="#3E5070" letterSpacing="2">{name.toUpperCase()}</text>
          </g>
        );
      })}
      {ROADS_NS.map(([name, lng, major]) => {
        const x = project(BOUNDS.north, lng).x;
        return (
          <g key={name}>
            <line x1={x} y1="0" x2={x} y2={H} stroke={major ? "#1C2C47" : "#16243C"} strokeWidth={major ? 18 : 9} strokeLinecap="round" />
            <text x={x + 14} y={H - 24} fontSize="12" fontWeight="600" fill="#3E5070" letterSpacing="2" transform={`rotate(-90 ${x + 14} ${H - 24})`}>{name.toUpperCase()}</text>
          </g>
        );
      })}
      {FILLER.map(([lat, lng, w, h], i) => <Building key={i} {...project(lat, lng)} w={w} h={h} />)}
      {LANDMARKS.map((l) => {
        const p = project(l.lat, l.lng);
        return (
          <g key={l.name}>
            <Building {...p} w={112} h={62} highlight />
            <text x={p.x} y={p.y + 62} textAnchor="middle" fontSize="15" fontWeight="700" fill="#A9C4DE">{l.name}</text>
          </g>
        );
      })}
    </>
  );
}

export default function CampusMap({ markers, active, hidden, selectedId, onSelect, popupContent }) {
  const svgRef = useRef(null);
  const popupRef = useRef(null);
  const staticMap = useMemo(() => <StaticMap />, []);
  const placed = useMemo(
    () => markers.map((m) => ({ ...m, p: project(m.lat, m.lng) })).filter((m) => inMap(m.p)),
    [markers]
  );

  // Keep the popup attached to its marker while the map tilts and zooms.
  useEffect(() => {
    if (selectedId == null) return;
    let raf = 0;
    const follow = () => {
      const core = svgRef.current?.querySelector(`[data-id="${selectedId}"] .lp-core`);
      const pop = popupRef.current;
      if (core && pop) {
        const r = core.getBoundingClientRect();
        const below = r.top < pop.offsetHeight + 110; // no room under the nav: open below
        pop.classList.toggle("lp-below", below);
        const half = pop.offsetWidth / 2 + 12;
        pop.style.left = Math.min(window.innerWidth - half, Math.max(half, r.left + r.width / 2)) + "px";
        pop.style.top = (below ? r.bottom : r.top) + "px";
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [selectedId]);

  return (
    <>
      <div className={`lp-bgmap ${active ? "lp-map-active" : ""}`}>
        <div className="lp-mapplane">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Campus map">
            {staticMap}
            <g>
              {placed.map((m) => (
                <g
                  key={m.id}
                  data-id={m.id}
                  className={`lp-marker ${selectedId === m.id ? "on" : ""}`}
                  style={{ display: hidden.has(m.kind) ? "none" : undefined }}
                  tabIndex={active ? 0 : -1}
                  role="button"
                  aria-label={`${m.title}, ${m.place}`}
                  onClick={(e) => { e.stopPropagation(); onSelect(selectedId === m.id ? null : m.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(m.id); } }}
                >
                  <circle className="lp-pulse" cx={m.p.x} cy={m.p.y} r="14" fill={KIND_COLORS[m.kind]} opacity=".5" />
                  <circle className="lp-core" cx={m.p.x} cy={m.p.y} r="11" fill={KIND_COLORS[m.kind]} stroke="#0A111E" strokeWidth="4" />
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
      <div ref={popupRef} className={`lp-popup ${selectedId != null ? "open" : ""}`} role="dialog" aria-live="polite" onClick={(e) => e.stopPropagation()}>
        {selectedId != null && popupContent}
      </div>
    </>
  );
}
