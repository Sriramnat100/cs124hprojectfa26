// Shared dropdown lists for Feature 1 (register) and Feature 2 (sightings).
// Values are lowercase because matching compares them exactly (see readme).

export const BRANDS = [
  "segway",
  "xiaomi",
  "gotrax",
  "hiboy",
  "apollo",
  "unagi",
  "razor",
  "swagtron",
  "other",
];

export const COLORS = [
  "black",
  "white",
  "gray",
  "silver",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "other",
];

// "segway" -> "Segway"
export function label(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}
