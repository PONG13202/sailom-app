// โซนเวลาไทย (+07:00)
export function dayRange(dateStr?: string) {
  const tz = "+07:00";
  const d = (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr))
    ? dateStr
    : new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const start = new Date(`${d}T00:00:00${tz}`);
  const end   = new Date(`${d}T24:00:00${tz}`);
  return { start, end, date: d };
}
