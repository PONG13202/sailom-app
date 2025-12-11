export function buildDaySlots(
  reservations: any[],
  date: string,
  open = "09:00",
  close = "22:00",
  stepMin = 30
) {
  const tz = "+07:00";
  const dayStart = new Date(`${date}T${open}${tz}`);
  const dayEnd   = new Date(`${date}T${close}${tz}`);

  // สร้างช่องเวลา
  const slots: { idx:number; start:Date; end:Date; label:string }[] = [];
  for (let t = +dayStart, i = 0; t < +dayEnd; t += stepMin*60000, i++) {
    const s = new Date(t);
    const e = new Date(t + stepMin*60000);
    slots.push({ idx: i, start: s, end: e, label: s.toTimeString().slice(0,5) });
  }

  // map โต๊ะ -> ช่องที่ถูกจอง
  const tables = new Map<number, { label:string; busy:Set<number>; byStatus: Map<number,string> }>();
  const mark = (tid:number, label:string, s:Date, e:Date, status:string) => {
    if (!tables.has(tid)) tables.set(tid, { label, busy:new Set(), byStatus:new Map() });
    const row = tables.get(tid)!;
    for (const sl of slots) {
      if (sl.start < e && sl.end > s) {
        row.busy.add(sl.idx);
        row.byStatus.set(sl.idx, status);
      }
    }
  };

  for (const r of reservations) {
    if (r.tableId == null) continue;
    const s = new Date(r.start);
    const e = new Date(r.end);
    const ss = s < dayStart ? dayStart : s;
    const ee = e > dayEnd   ? dayEnd   : e;
    if (ss < ee) mark(r.tableId, r.tableLabel ?? `#${r.tableId}`, ss, ee, r.status);
  }

  return { slots, tables: Array.from(tables, ([tableId, v]) => ({ tableId, ...v })) };
}
