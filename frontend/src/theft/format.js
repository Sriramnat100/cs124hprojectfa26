// "2026-09-23" -> "Sep 23, 2026" (read as a calendar date, so no timezone shift)
export function formatDate(value) {
  if (!value) return "unknown";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
