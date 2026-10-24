import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useSettings } from "../settings.js";
import { label } from "../scooterOptions.js";
import { BRANDS, LANDMARKS, labelFor } from "../sighting/constants.js";
import { photoUrl, timeAgo } from "../sighting/helpers.js";
import CampusMap, { KIND_COLORS } from "./CampusMap.jsx";
import { mountScooterScene } from "./scene.js";
import "./landing.css";

gsap.registerPlugin(ScrollTrigger);

const STORY = [
  ["One", "Scooter.", "Every ride has its own details: the brand, the color, the scratches only you would notice."],
  ["One", "Identity.", "Save those details once, and your scooter becomes recognizable anywhere on campus."],
  ["One Connected", "Campus.", "Students share one map, so a missing scooter never truly disappears."],
];

// Shown to visitors who aren't logged in (live sightings need an account).
const landmark = (name) => LANDMARKS.find((l) => l.name === name);
const SAMPLES = [
  ["Grainger", 0.0002, -0.0003, "Black Segway", "Locked to the bike rack"],
  ["Union", -0.0002, 0.0004, "Red Xiaomi", "White stripe on the stem"],
  ["Siebel", 0.0001, 0.0002, "Blue Gotrax", "Duck sticker on the deck"],
  ["ISR", 0, -0.0004, "White Hiboy", "Green lights under the deck"],
  ["Main Library", 0.0002, 0.0003, "Black Segway", "Phone mount on the handlebar"],
].map(([place, dLat, dLng, title, note], i) => ({
  id: `sample-${i}`, kind: "sample", lat: landmark(place).lat + dLat, lng: landmark(place).lng + dLng,
  title, place: `Near ${place}`, time: "Example", note, photo: null,
}));

function toMarker(s) {
  const brand = s.brand && s.brand !== "unsure" ? labelFor(BRANDS, s.brand) : "";
  const color = s.color && s.color !== "unsure" && s.color !== "other" ? s.color[0].toUpperCase() + s.color.slice(1) : "";
  return {
    id: s.id, kind: s.mine ? "mine" : "sighting", lat: s.lat, lng: s.lng,
    title: [color, brand].filter(Boolean).join(" ") || "Scooter",
    place: s.landmark ? `Near ${s.landmark}` : "Custom spot",
    time: timeAgo(s.seen_at), note: s.notes || (s.features.length ? s.features.join(", ") : ""),
    photo: s.photos[0] ? photoUrl(s.photos[0].url) : null,
  };
}

const ScooterSketch = () => (
  <svg viewBox="0 0 120 72" fill="none" stroke="#7F93B2" strokeWidth="3" strokeLinecap="round"><path d="M34 58l30-46h12" /><path d="M22 58h70" /><circle cx="22" cy="58" r="9" /><circle cx="94" cy="58" r="9" /></svg>
);

export default function Landing() {
  const { user } = useAuth();
  const settings = useSettings(user);
  const reducedMotion = useMemo(
    () => settings.reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [settings.reduceMotion]
  );

  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sectionRefs = { story: useRef(null), my: useRef(null), map: useRef(null), closing: useRef(null) };
  const sceneRef = useRef(null);

  const [scooter, setScooter] = useState(undefined); // undefined = loading, null = none
  const [sightings, setSightings] = useState(null);
  const [mapActive, setMapActive] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);

  // Real data when logged in.
  useEffect(() => {
    if (!user) { setScooter(null); setSightings(null); return; }
    // show a stolen scooter first, since that is the one the campus should look for
    api("/scooters/mine").then((list) => setScooter(list.find((x) => x.status === "stolen") ?? list[0] ?? null)).catch(() => setScooter(null));
    api("/sightings/map?days=30").then(setSightings).catch(() => setSightings([]));
  }, [user]);

  const markers = useMemo(() => (user ? (sightings ?? []).map(toMarker) : SAMPLES), [user, sightings]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return markers.filter((m) => !hidden.has(m.kind) && (!q || `${m.title} ${m.place} ${m.note}`.toLowerCase().includes(q)));
  }, [markers, hidden, query]);
  const selected = markers.find((m) => m.id === selectedId) ?? null;

  // 3D scene
  useEffect(() => {
    const root = rootRef.current;
    const sections = Object.fromEntries(Object.entries(sectionRefs).map(([k, r]) => [k, r.current]));
    sceneRef.current = mountScooterScene({
      canvas: canvasRef.current, root, sections, reducedMotion,
      canRotate: () => root.classList.contains("lp-can-rotate"),
    });
    return () => { sceneRef.current?.dispose(); sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
  useEffect(() => { sceneRef.current?.setMapZoom(zoom); }, [zoom]);

  // Scroll-linked text and UI (the scooter itself is driven by scene.js)
  useEffect(() => {
    const root = rootRef.current;
    const ctx = gsap.context(() => {
      if (!reducedMotion) {
        gsap.to([".lp-hero-copy", ".lp-scroll-hint"], { opacity: 0, y: -40, ease: "none", scrollTrigger: { trigger: ".lp-hero", start: "top top", end: "bottom 45%", scrub: true } });
        const steps = gsap.utils.toArray(".lp-story-step");
        const bars = gsap.utils.toArray(".lp-story-progress b");
        const tl = gsap.timeline({ scrollTrigger: { trigger: sectionRefs.story.current, start: "top top", end: "bottom bottom", scrub: true } });
        steps.forEach((step, i) => {
          tl.to(step, { opacity: 1, y: 0, duration: 1 }, i * 3).to(bars[i], { scaleX: 1, duration: 2.6, ease: "none" }, i * 3);
          if (i < steps.length - 1) tl.to(step, { opacity: 0, y: -28, duration: 1 }, i * 3 + 2);
        });
        tl.to({}, { duration: 1 });
        gsap.to([".lp-map-head", ".lp-map-panel", ".lp-map-zoom"], { opacity: 1, y: 0, x: 0, stagger: 0.08, ease: "none", scrollTrigger: { trigger: sectionRefs.map.current, start: "top 35%", end: "top top", scrub: true } });
      }
      ScrollTrigger.create({ trigger: sectionRefs.my.current, start: "top 55%", end: "bottom 45%", onToggle: (s) => root.classList.toggle("lp-can-rotate", s.isActive) });
      ScrollTrigger.create({
        trigger: sectionRefs.map.current, start: "top 15%", end: "bottom 60%",
        onToggle: (s) => { setMapActive(s.isActive); if (!s.isActive) { setSelectedId(null); setZoom(1); } },
      });
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Layout can shift when data arrives; recompute scroll positions.
  useEffect(() => {
    sceneRef.current?.rebuild();
    ScrollTrigger.refresh();
  }, [scooter, sightings]);

  // Close the popup on outside clicks.
  useEffect(() => {
    const close = () => setSelectedId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const toggleKind = (kind) => setHidden((h) => { const n = new Set(h); n.has(kind) ? n.delete(kind) : n.add(kind); return n; });
  const kinds = user ? [["sighting", "Sightings"], ["mine", "Yours"]] : [["sample", "Examples"]];

  const popupContent = selected && (
    <>
      <div className="lp-popup-photo">{selected.photo ? <img src={selected.photo} alt={selected.title} /> : <ScooterSketch />}</div>
      <b>{selected.title}</b>
      <p>{selected.place} · {selected.time}</p>
      {selected.note && <p>{selected.note}</p>}
      <div className="lp-popup-foot">
        <span className="lp-tag" style={{ color: KIND_COLORS[selected.kind], background: `${KIND_COLORS[selected.kind]}1a` }}>
          {selected.kind === "mine" ? "You reported this" : selected.kind === "sample" ? "Example" : "Sighting"}
        </span>
        {user ? <Link to="/view-sightings">Open map →</Link> : <Link to="/login">Log in for live data →</Link>}
      </div>
    </>
  );

  return (
    <div ref={rootRef} className={`lp-root ${reducedMotion ? "lp-reduced" : ""}`}>
      <CampusMap markers={shown} active={mapActive} hidden={new Set()} selectedId={selectedId} onSelect={setSelectedId} popupContent={popupContent} />
      <canvas ref={canvasRef} className="lp-canvas" aria-label="3D electric scooter" role="img" />

      <main className="lp-main">
        {/* 1. Hero */}
        <section className="lp-hero" aria-label="Introduction">
          <div className="lp-wrap lp-hero-copy">
            <h1>Your Scooter.<br /><span>Your Identity.</span></h1>
            <p>Discover a smarter way to identify, manage, and protect your ride.</p>
          </div>
          <div className="lp-scroll-hint" aria-hidden="true"><span className="lp-mouse" />Scroll</div>
        </section>

        {/* 2. Story */}
        <section ref={sectionRefs.story} className="lp-story" aria-label="One scooter, one identity, one connected campus">
          <div className="lp-story-pin">
            <div className="lp-wrap">
              <div className="lp-story-steps">
                {STORY.map(([a, b, text], i) => (
                  <div key={i} className="lp-story-step">
                    <span className="lp-num">0{i + 1}</span>
                    <h2>{a} <em>{b}</em></h2>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
              <div className="lp-story-progress" aria-hidden="true"><i><b /></i><i><b /></i><i><b /></i></div>
            </div>
          </div>
        </section>

        {/* 3. My Scooter */}
        <section ref={sectionRefs.my} className="lp-my" id="my" aria-label="My Scooter">
          <div className="lp-wrap">
            <div className="lp-my-copy">
              <span className="lp-eyebrow">My Scooter</span>
              <h2>Meet Your Scooter.</h2>
              <p className="lp-lead">Every scooter has an identity. Make yours recognizable.</p>
              <MyScooterActions user={user} scooter={scooter} />
              <ScooterCard user={user} scooter={scooter} />
            </div>
          </div>
          <div className="lp-rotate-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" /><path d="M18.5 2.5v3.3h-3.3M5.5 21.5v-3.3h3.3" /></svg>
            Drag to rotate 360°
          </div>
        </section>

        {/* 4. Campus map */}
        <section ref={sectionRefs.map} className="lp-mapsec" aria-label="Explore the campus map">
          <div className="lp-mapsec-pin">
            <div className="lp-map-head lp-wrap">
              <span className="lp-eyebrow">Explore Map</span>
              <h2>The whole campus, connected.</h2>
            </div>
            <aside className="lp-map-panel" aria-label="Map controls" onClick={(e) => e.stopPropagation()}>
              <label className="lp-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a building, brand or color" aria-label="Search the map" />
              </label>
              <div className="lp-chips" role="group" aria-label="Filter markers">
                {kinds.map(([kind, text]) => (
                  <button key={kind} type="button" className="lp-chip" aria-pressed={!hidden.has(kind)} onClick={() => toggleKind(kind)}>
                    <i style={{ background: KIND_COLORS[kind] }} />{text}
                  </button>
                ))}
              </div>
              <div className="lp-recent">
                {shown.slice(0, 4).map((m) => (
                  <button key={m.id} type="button" className={selectedId === m.id ? "on" : ""} onClick={() => setSelectedId(m.id)}>
                    <span className="lp-dot" style={{ background: `${KIND_COLORS[m.kind]}1f` }}><i style={{ background: KIND_COLORS[m.kind] }} /></span>
                    <span><b>{m.title}</b><span>{m.place} · {m.time}</span></span>
                  </button>
                ))}
                {user && sightings && shown.length === 0 && <p className="lp-empty">No sightings match. <Link to="/submit-sighting">Report one</Link></p>}
              </div>
              <Link to={user ? "/view-sightings" : "/login"} className="lp-panel-link">{user ? "Open the full map →" : "Log in to see live sightings →"}</Link>
            </aside>
            <div className="lp-map-zoom" role="group" aria-label="Zoom" onClick={(e) => e.stopPropagation()}>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}>+</button>
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.85, z - 0.15))}>−</button>
            </div>
          </div>
        </section>

        {/* 5. Closing */}
        <section ref={sectionRefs.closing} className="lp-closing" aria-label="Get started">
          <div className="lp-wrap">
            <span className="lp-eyebrow">ScooterTrace</span>
            <div className="lp-journey"><span>One Scooter</span><i>→</i><span>One Identity</span><i>→</i><span>One Connected Campus</span></div>
            <h2>Protect your ride today.</h2>
            <div className="lp-cta-row lp-center">
              {user ? (
                <>
                  <Link className="lp-btn lp-btn-primary" to="/submit-sighting">Report a Sighting</Link>
                  <Link className="lp-btn lp-btn-ghost" to="/view-sightings">Explore the Map</Link>
                </>
              ) : (
                <>
                  <Link className="lp-btn lp-btn-primary" to="/login">Log in to Get Started</Link>
                  <a className="lp-btn lp-btn-ghost" href="#my">See How It Works</a>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="lp-footer"><div className="lp-wrap"><span>© 2026 ScooterTrace · CS 124 Honors · Group 1</span><span>Made for the UIUC campus</span></div></footer>
    </div>
  );
}

function MyScooterActions({ user, scooter }) {
  const arrow = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  const scan = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></svg>;
  if (!user) {
    return (
      <div className="lp-cta-row">
        <Link className="lp-btn lp-btn-primary" to="/login">Log in to Register {arrow}</Link>
        <Link className="lp-btn lp-btn-ghost" to="/login">{scan} Recognize My Scooter</Link>
      </div>
    );
  }
  if (scooter === null) {
    return (
      <div className="lp-cta-row">
        <Link className="lp-btn lp-btn-primary" to="/register-scooter">Register My Scooter {arrow}</Link>
        <Link className="lp-btn lp-btn-ghost" to="/submit-sighting">Report a Sighting</Link>
      </div>
    );
  }
  return (
    <div className="lp-cta-row">
      <Link className="lp-btn lp-btn-primary" to={scooter ? `/scooters/${scooter.id}` : "/my-scooters"}>My Scooter {arrow}</Link>
      <Link className="lp-btn lp-btn-ghost" to="/matches">{scan} Recognize My Scooter</Link>
    </div>
  );
}

function ScooterCard({ user, scooter }) {
  if (user && scooter === undefined) return <div className="lp-vcard lp-loading" aria-busy="true">Loading your scooter…</div>;
  if (user && scooter === null) {
    return (
      <div className="lp-vcard">
        <div className="lp-vcard-top"><b>No scooter yet</b><span className="lp-status lp-status-none">Not registered</span></div>
        <p className="lp-vcard-note">Register it once with photos and details, and the whole campus can help recognize it.</p>
      </div>
    );
  }
  const s = scooter ?? { brand: "segway", model: "Ninebot Max G30", color: "black", serial_number: "SEG-G30-48213", status: "registered" };
  const stolen = s.status === "stolen";
  return (
    <div className="lp-vcard">
      <div className="lp-vcard-top">
        <b>{label(s.brand)} {s.model}</b>
        <span className={`lp-status ${stolen ? "lp-status-stolen" : ""}`}>{!user ? "Example" : stolen ? "Reported stolen" : "Registered"}</span>
      </div>
      <div className="lp-specs">
        <div><span>Brand</span><b>{label(s.brand)}</b></div>
        <div><span>Color</span><b>{label(s.color)}</b></div>
        <div><span>Serial</span><b>{s.serial_number ? `•••• ${s.serial_number.slice(-4)}` : "—"}</b></div>
      </div>
    </div>
  );
}
