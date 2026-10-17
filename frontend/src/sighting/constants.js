// Shared settings for the Submit a sighting feature.
// Keep the value lists in sync with backend/app/routers/sightings.py.
// Brand and color must match Feature 1's lists exactly, because matching compares them.

export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 5;
export const MAX_NOTES = 200;
export const MAX_SERIAL = 40;

// The first photo boxes tell people what to photograph. Extra boxes can be added up to MAX_PHOTOS.
export const GUIDED_SLOTS = [
  { label: "Side view", required: true },
  { label: "Front or back", required: true },
  { label: "Close-up of stickers / marks", required: false },
];

export const BRANDS = [
  { value: "segway", label: "Segway" },
  { value: "xiaomi", label: "Xiaomi" },
  { value: "gotrax", label: "Gotrax" },
  { value: "hiboy", label: "Hiboy" },
  { value: "apollo", label: "Apollo" },
  { value: "other", label: "Other" },
  { value: "unsure", label: "Not sure" },
];

export const COLORS = [
  { value: "black", swatch: "#1d1d1f" },
  { value: "white", swatch: "#f4f4f4" },
  { value: "gray", swatch: "#9097a3" },
  { value: "red", swatch: "#d83a3a" },
  { value: "blue", swatch: "#2f6fdb" },
  { value: "green", swatch: "#2f9d5d" },
  { value: "other", swatch: "conic-gradient(#d83a3a, #f2c94c, #2f9d5d, #2f6fdb, #d83a3a)" },
  { value: "unsure", swatch: "repeating-linear-gradient(45deg, #ccc, #ccc 4px, #fff 4px, #fff 8px)", label: "not sure" },
];

export const FEATURES = [
  { value: "sticker", label: "🏷️ Sticker" },
  { value: "basket", label: "🧺 Basket" },
  { value: "phone mount", label: "📱 Phone mount" },
  { value: "scratches", label: "〰️ Scratches" },
  { value: "damaged", label: "💥 Damaged" },
  { value: "bell", label: "🔔 Bell" },
  { value: "lights", label: "💡 Lights" },
];

// "Someone is riding it" is left out on purpose so nobody is encouraged to follow riders.
export const SITUATIONS = [
  { value: "locked", label: "🔒 Locked to a rack" },
  { value: "lying", label: "🛴 Just lying around" },
  { value: "abandoned", label: "🍂 Looks abandoned" },
];

// Map settings. Landmark positions are approximate building entrances.
export const CAMPUS_CENTER = [40.1085, -88.2265];
export const CAMPUS_BOUNDS = { south: 40.095, north: 40.12, west: -88.24, east: -88.212 };
export const LANDMARKS = [
  { name: "Siebel", lat: 40.1138, lng: -88.2249 },
  { name: "Grainger", lat: 40.1125, lng: -88.2269 },
  { name: "ECEB", lat: 40.115, lng: -88.228 },
  { name: "Union", lat: 40.1092, lng: -88.2272 },
  { name: "ISR", lat: 40.1071, lng: -88.2205 },
  { name: "Main Library", lat: 40.1047, lng: -88.229 },
  { name: "Krannert", lat: 40.108, lng: -88.2224 },
];

export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label ?? value;
}
