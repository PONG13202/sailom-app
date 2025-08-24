"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { config } from "@/app/config";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { socket } from "@/app/socket";
import { buildDaySlots } from "@/lib/slots";
import { cn } from "@/lib/utils";
import {
  Calendar as IconCalendar,
  RefreshCw,
  Filter,
  Info,
  Users,
  Clock,
} from "lucide-react";

/** -------------------- Types -------------------- */
type ResvRow = {
  id: number;
  tableId: number | null;
  tableLabel: string;
  start: string;
  end: string;
  people: number;
  status:
    | "PENDING_OTP"
    | "OTP_VERIFIED"
    | "AWAITING_PAYMENT"
    | "CONFIRMED"
    | string;
  user: { id: number; name: string; phone?: string | null };
};

/** -------------------- Helpers -------------------- */
const STATUS_META: Record<
  string,
  { label: string; pill: string; cell: string }
> = {
  CONFIRMED: {
    label: "ยืนยันแล้ว",
    pill: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cell: "bg-emerald-200",
  },
  AWAITING_PAYMENT: {
    label: "รอชำระ",
    pill: "bg-amber-100 text-amber-700 border-amber-200",
    cell: "bg-amber-200",
  },
  OTP_VERIFIED: {
    label: "OTP ผ่าน",
    pill: "bg-sky-100 text-sky-700 border-sky-200",
    cell: "bg-sky-200",
  },
  PENDING_OTP: {
    label: "รอ OTP",
    pill: "bg-indigo-100 text-indigo-700 border-indigo-200",
    cell: "bg-indigo-200",
  },
};

function statusCellColor(st?: string) {
  if (!st) return "bg-white";
  return STATUS_META[st]?.cell ?? "bg-violet-200";
}

/** -------------------- Page -------------------- */
export default function SchedulePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [step, setStep] = useState(30); // นาทีต่อช่อง
  const [rows, setRows] = useState<ResvRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [qTable, setQTable] = useState("");
  const [showStatus, setShowStatus] = useState<Record<string, boolean>>({
    PENDING_OTP: true,
    OTP_VERIFIED: true,
    AWAITING_PAYMENT: true,
    CONFIRMED: true,
  });

  // dialog (slot detail)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<{ tableId: number; slotIdx: number } | null>(null);

  /** ------------ stable fetch ------------ */
  const fetchDay = useCallback(
    async (d: string) => {
      try {
        setLoading(true);
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: Record<string, string> = { "Cache-Control": "no-store" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const { data } = await axios.get(`${config.apiUrl}/reservation`, {
          params: { date: d, includeCanceled: 0 },
          headers,
        });

        setRows((data?.data ?? []) as ResvRow[]);
      } finally {
        setLoading(false);
      }
    },
    [] // ไม่ผูก state ไหน ๆ เพื่อรักษา identity
  );

  // initial + when date changes
  useEffect(() => {
    fetchDay(date);
  }, [date, fetchDay]);

  // realtime: ฟังเฉพาะเหตุ "เปลี่ยนสถานะ" เท่านั้น (อย่าฟัง reservation:day จะเกิด loop)
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const refresh = () => fetchDay(date);

    socket.on("reservation:created", refresh);
    socket.on("reservation:updated", refresh);
    socket.on("reservation:confirmed", refresh);
    socket.on("reservation:expired", refresh);
    socket.on("reservation:canceled", refresh);
    socket.on("payment:succeeded", refresh);

    return () => {
      socket.off("reservation:created", refresh);
      socket.off("reservation:updated", refresh);
      socket.off("reservation:confirmed", refresh);
      socket.off("reservation:expired", refresh);
      socket.off("reservation:canceled", refresh);
      socket.off("payment:succeeded", refresh);
    };
  }, [date, fetchDay]);

  // apply filters
  const filteredRows = useMemo(() => {
    const kw = qTable.trim().toLowerCase();
    return rows.filter((r) => {
      const passStatus = showStatus[r.status] ?? true;
      const passKw =
        !kw || (r.tableLabel || "").toLowerCase().includes(kw);
      return passStatus && passKw;
    });
  }, [rows, qTable, showStatus]);

  const grid = useMemo(
    () => buildDaySlots(filteredRows as any, date, openTime, closeTime, step),
    [filteredRows, date, openTime, closeTime, step]
  );

  // summary
  const summary = useMemo(() => {
    const total = filteredRows.length;
    const by = filteredRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    return { total, by };
  }, [filteredRows]);

  // open details for a slot
  const openSlotDetail = (tableId: number, slotIdx: number) => {
    setDetail({ tableId, slotIdx });
    setDetailOpen(true);
  };

  const slotReservations = useMemo(() => {
    if (!detail) return [];
    const sl = grid.slots[detail.slotIdx];
    if (!sl) return [];
    const s = sl.start.getTime();
    const e = sl.end.getTime();
    return rows
      .filter(
        (r) =>
          r.tableId === detail.tableId &&
          new Date(r.start).getTime() < e &&
          new Date(r.end).getTime() > s
      )
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }, [detail, grid.slots, rows]);

  return (
    <main className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">ตารางการจอง</h1>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 pr-9"
            />
            <IconCalendar className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
          </div>

          <select
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="h-9 rounded-md border px-2 text-sm"
          >
            {["07:00", "08:00", "09:00", "10:00", "11:00"].map((t) => (
              <option key={t} value={t}>
                เปิด {t}
              </option>
            ))}
          </select>
          <select
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="h-9 rounded-md border px-2 text-sm"
          >
            {["20:00", "21:00", "22:00", "23:00"].map((t) => (
              <option key={t} value={t}>
                ปิด {t}
              </option>
            ))}
          </select>
          <select
            value={step}
            onChange={(e) => setStep(parseInt(e.target.value, 10))}
            className="h-9 rounded-md border px-2 text-sm"
          >
            {[15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} นาที/ช่อง
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => fetchDay(date)} // ส่ง date ชัดเจน
          >
            <RefreshCw className="mr-2 h-4 w-4" /> รีเฟรช
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <Input
            placeholder="ค้นหาโต๊ะ…"
            className="h-9 w-44"
            value={qTable}
            onChange={(e) => setQTable(e.target.value)}
          />
          {/* status pills toggle */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const on = showStatus[key] ?? true;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setShowStatus((p) => ({ ...p, [key]: !on }))
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition",
                    on
                      ? meta.pill
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                  title={meta.label}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card className="p-3 flex items-center gap-4">
        <div className="text-sm text-slate-700">
          ทั้งหมด <span className="font-semibold">{summary.total}</span> รายการ
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(STATUS_META).map(([k, meta]) => (
            <span
              key={k}
              className={cn("rounded-full border px-2 py-0.5", meta.pill)}
            >
              {meta.label}: {summary.by[k] ?? 0}
            </span>
          ))}
        </div>
      </Card>

      {/* Grid */}
      <Card className="p-3 overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-10">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 grid gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </div>
        ) : grid.tables.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            ไม่มีข้อมูลการจองในวันที่เลือก
          </div>
        ) : (
          <div className="min-w-[960px]">
            {/* header */}
            <div
              className="grid text-xs"
              style={{
                gridTemplateColumns: `220px repeat(${grid.slots.length}, 1fr)`,
              }}
            >
              <div className="sticky left-0 z-10 bg-white p-2 font-medium border-b rounded-l">
                โต๊ะ / เวลา
              </div>
              {grid.slots.map((s) => (
                <div
                  key={s.idx}
                  className="p-2 text-center border-b text-slate-600"
                >
                  {s.label}
                </div>
              ))}
            </div>

            {/* rows */}
            {grid.tables.map((t, rowIdx) => (
              <div
                key={t.tableId}
                className="grid"
                style={{
                  gridTemplateColumns: `220px repeat(${grid.slots.length}, 1fr)`,
                }}
              >
                {/* left label */}
                <div
                  className={cn(
                    "sticky left-0 z-10 bg-white p-2 border-b font-medium",
                    rowIdx % 2 ? "bg-slate-50" : "bg-white"
                  )}
                >
                  {t.label}
                </div>

                {/* cells */}
                {grid.slots.map((s) => {
                  const st = (t as any).byStatus.get(s.idx) as
                    | string
                    | undefined;
                  const title = st
                    ? `${t.label} • ${s.label} — ${
                        STATUS_META[st]?.label ?? st
                      }`
                    : `${t.label} • ${s.label}`;
                  return (
                    <button
                      key={s.idx}
                      title={title}
                      onClick={() =>
                        st && openSlotDetail(t.tableId as number, s.idx)
                      }
                      className={cn(
                        "h-8 border-b border-r transition",
                        rowIdx % 2 ? "bg-slate-50/60" : "bg-white",
                        st &&
                          "outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-violet-400",
                        statusCellColor(st)
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Legend & hint */}
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <Info className="h-4 w-4" />
        <span>คลิกช่องสีเพื่อดูรายละเอียดการจองในช่วงนั้น</span>
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg bg-white p-0 overflow-hidden rounded-2xl border">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base font-semibold">
              รายละเอียดการจอง
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4">
            {!detail ? (
              <div className="text-sm text-slate-500">ไม่มีข้อมูล</div>
            ) : (
              <>
                <div className="mb-3 text-sm text-slate-700 flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span>
                    เวลา: {grid.slots[detail.slotIdx]?.label} –{" "}
                    {grid.slots[detail.slotIdx + 1]?.label ?? closeTime}
                  </span>
                </div>

                {slotReservations.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    ไม่มีการจองซ้อนในช่องเวลานี้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {slotReservations.map((r) => (
                      <div key={r.id} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {r.user.name || `User #${r.user.id}`}
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs",
                              STATUS_META[r.status]?.pill
                            )}
                          >
                            {STATUS_META[r.status]?.label ?? r.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                          <Users className="h-3.5 w-3.5" />
                          <span>{r.people} คน</span>
                          <Clock className="ml-2 h-3.5 w-3.5" />
                          <span>
                            {new Date(r.start).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {new Date(r.end).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {r.user.phone ? (
                            <span className="ml-2">โทร {r.user.phone}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
