// Brand and color lists for Feature 1 (register a scooter).
// They come from the sighting feature's lists so both sides always match,
// because matching compares them exactly. "unsure" is only for spotters:
// owners know their own scooter.
import { BRANDS as SIGHTING_BRANDS, COLORS as SIGHTING_COLORS } from "./sighting/constants.js";

export const BRANDS = SIGHTING_BRANDS.map((b) => b.value).filter((v) => v !== "unsure");
export const COLORS = SIGHTING_COLORS.map((c) => c.value).filter((v) => v !== "unsure");

// "segway" -> "Segway"
export function label(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "";
}
