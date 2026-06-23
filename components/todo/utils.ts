export function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function parseDateStr(d: number) {
  return new Date(d * 86400000);
}

export function formatTimestamp(ts: number | null | undefined) {
  if (!ts) return "N/A";
  return new Date(ts * 1000).toLocaleString();
}

export function yyyymmddToDateString(d: number | null | undefined) {
  if (!d) return "";
  const date = new Date(d * 86400000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateStringToYyyymmdd(str: string) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function timestampToDateString(ts: number | null | undefined) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateStringToTimestamp(str: string) {
  if (!str) return null;
  return Math.floor(new Date(str).getTime() / 1000);
}
