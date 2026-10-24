// What the points-shop items look like. Names and prices live in backend/app/routers/shop.py;
// keep the ids in sync. `ink` is the initials color that reads well on that background.
import { useEffect, useState } from "react";
import { api } from "./api.js";

export const BACKGROUNDS = {
  "bg-aurora": { css: "linear-gradient(140deg, #3CD6C4 0%, #7DD3FC 45%, #B69CFF 100%)", ink: "#06121F" },
  "bg-sunset": { css: "linear-gradient(140deg, #FFD27A 0%, #FF7A9C 52%, #9B5CF6 100%)", ink: "#1A0B24" },
  "bg-ocean": { css: "linear-gradient(160deg, #22D3EE 0%, #2563EB 52%, #1E1B6B 100%)", ink: "#FFFFFF" },
  "bg-illini": { css: "linear-gradient(135deg, #FF5F05 0%, #FF5F05 47%, #13294B 53%, #13294B 100%)", ink: "#FFFFFF" },
  "bg-galaxy": { css: "radial-gradient(circle at 30% 25%, #F0ABFC 0%, #8B5CF6 28%, #312E81 62%, #0B0F2A 100%)", ink: "#FFFFFF" },
  "bg-gold": { css: "linear-gradient(140deg, #FFF3C4 0%, #F6C453 35%, #C98A1B 70%, #FCE7A6 100%)", ink: "#3A2400" },
};

// Frames are a gradient ring around the avatar. `spin` ones slowly rotate (see .av-spin in index.css).
export const FRAMES = {
  "fr-silver": { css: "linear-gradient(140deg, #FFFFFF, #94A3B8 50%, #E2E8F0)" },
  "fr-gold": { css: "linear-gradient(140deg, #FFF1B8, #E0A526 45%, #8A5A00 70%, #FFE08A)" },
  "fr-neon": { css: "conic-gradient(from var(--av-angle, 0deg), #3CD6C4, #7DD3FC, #A78BFA, #3CD6C4)", glow: "0 0 12px rgba(60, 214, 196, 0.7)", spin: true },
  "fr-rainbow": { css: "conic-gradient(from var(--av-angle, 0deg), #FF5E5E, #FFB547, #FFE45E, #5EE07A, #5EC8FF, #8B7BFF, #FF5EC4, #FF5E5E)", spin: true },
  "fr-flame": { css: "conic-gradient(from var(--av-angle, 200deg), #FFE45E, #FF8A00, #FF3D00, #FF8A00, #FFE45E)", glow: "0 0 14px rgba(255, 120, 0, 0.65)", spin: true },
};

const DEFAULT_BG = "linear-gradient(140deg, #3CD6C4, #2A7FB8)";

// Inline style for an avatar circle. `baseBg` is the free color to use when no shop background is on.
export function avatarStyle({ background, frame, baseBg = DEFAULT_BG, ring = 3 }) {
  const bg = BACKGROUNDS[background];
  const fr = FRAMES[frame];
  const fill = bg?.css ?? baseBg;
  const style = { color: bg?.ink ?? "#06121F" };
  if (fr) {
    style.background = `${fill} padding-box, ${fr.css} border-box`;
    style.border = `${ring}px solid transparent`;
    if (fr.glow) style.boxShadow = fr.glow;
  } else {
    style.background = fill;
  }
  return style;
}

export function avatarClass(frame) {
  return FRAMES[frame]?.spin ? "av-spin" : "";
}

// Tell every usePoints() on the page to refetch (after buying, equipping, reporting...).
export function notifyPointsChange() {
  window.dispatchEvent(new CustomEvent("points-change"));
}

// The logged-in user's points, rank, balance and equipped items, kept fresh.
export function usePoints(user) {
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!user) return setMe(null);
    let alive = true;
    const load = () => api("/points/me").then((d) => alive && setMe(d)).catch(() => {});
    load();
    window.addEventListener("points-change", load);
    return () => { alive = false; window.removeEventListener("points-change", load); };
  }, [user]);
  return me;
}
