export function timeAgo(d) {
  const ts = typeof d === "string" ? Date.parse(d) : +new Date(d || Date.now());
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  const units = [
    ["yr", 31536000],
    ["mo", 2592000],
    ["wk", 604800],
    ["day", 86400],
    ["hr", 3600],
    ["min", 60]
  ];
  for (const [label, sec] of units) {
    const v = Math.floor(s / sec);
    if (v >= 1) return `${v} ${label}${v > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
