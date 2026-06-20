export function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function parseDateStr(d: number) {
  const str = String(d);
  const y = parseInt(str.substring(0, 4), 10);
  const m = parseInt(str.substring(4, 6), 10) - 1;
  const day = parseInt(str.substring(6, 8), 10);
  return new Date(y, m, day);
}

export function formatTimestamp(ts: number | null | undefined) {
  if (!ts) return "N/A";
  return new Date(ts * 1000).toLocaleString();
}

export function yyyymmddToDateString(d: number | null | undefined) {
  if (!d) return "";
  const str = String(d);
  return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
}

export function dateStringToYyyymmdd(str: string) {
  if (!str) return null;
  return parseInt(str.replace(/-/g, ''), 10);
}

export function timestampToDateString(ts: number | null | undefined) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateStringToTimestamp(str: string) {
  if (!str) return null;
  return Math.floor(new Date(str).getTime() / 1000);
}
