import { CAMPUS_BOUNDS, LANDMARKS } from "./constants.js";

// Phone photos can be 4000px and several MB. Shrink them in the browser before
// uploading or saving a draft, so uploads are fast and drafts fit in localStorage.
export function resizeImage(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't read ${file.name}`));
    };
    img.src = url;
  });
}

export async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

// The backend returns photo paths like /sightings/photos/abc.jpg. Vite forwards /api/... to it.
export function photoUrl(path) {
  return `/api${path}`;
}

// Rough distance in meters, accurate enough for a few blocks of campus.
function metersBetween(a, b) {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export function nearestLandmark(loc, withinMeters = 120) {
  let best = null;
  for (const landmark of LANDMARKS) {
    const d = metersBetween(loc, landmark);
    if (d <= withinMeters && (!best || d < best.d)) best = { name: landmark.name, d };
  }
  return best?.name ?? null;
}

export function isOffCampus(loc) {
  const b = CAMPUS_BOUNDS;
  return loc.lat < b.south || loc.lat > b.north || loc.lng < b.west || loc.lng > b.east;
}

// "14:05" -> a Date for today at 2:05 pm. Empty string means "just now".
export function timeToday(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatWhen(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

// "5 min ago", "3 h ago", "2 days ago"
export function timeAgo(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// localStorage can be full, blocked, or hold old data, so never let it crash the page.
export function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
