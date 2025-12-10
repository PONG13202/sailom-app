"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "@/app/config";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Receipt,
  CircleDollarSign,
  Pencil,
  Save,
  Ban,
} from "lucide-react";

/** -------------------- Types -------------------- */
type ResvRow = {
  id: number;
  tableId: number | null;
  tableLabel: string;
  start: string;
  end?: string;
  people: number;
  status:
    | "PENDING_OTP"
    | "OTP_VERIFIED"
    | "AWAITING_PAYMENT"
    | "CONFIRMED"
    | "EXPIRED"
    | "CANCELED"
    | string;
  user: { id: number; name: string; phone?: string | null };
  // เผื่อ API คืนมา
  orderId?: number | null;
  paymentId?: number | null;
};

type PaymentRow = {
  id: number;
  amount: number;
  status: "PENDING" | "SUBMITTED" | "PAID" | "EXPIRED" | "CANCELED";
  qrDataUrl?: string | null;
  expiresAt?: string | null;
  slipImage?: string | null;
  confirmedAt?: string | null;
};

type OrderItem = {
  id: number;
  menuId: number;
  name: string;
  price: number;
  qty: number;
  note?: string | null;
  options?: any;
};

type OrderRow = {
  id: number;
  total: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED";
  items: OrderItem[];
  paymentId?: number | null;
};

type ReservationDetail = {
  id: number;
  userId: number;
  tableId: number | null;
  tableLabel?: string;
  dateStart: string;
  dateEnd?: string | null;
  people: number;
  status:
    | "PENDING_OTP"
    | "OTP_VERIFIED"
    | "AWAITING_PAYMENT"
    | "CONFIRMED"
    | "EXPIRED"
    | "CANCELED"
    | string;
  paymentId?: number | null;
  orderId?: number | null;
  depositAmount?: number;
  paymentExpiresAt?: string | null;
  slipImage?: string | null;
  user?: { id: number; name: string; phone?: string | null; email?: string | null };
};

type DayOrderRow = OrderRow & {
  reservationId?: number;
  tableLabel?: string;
  start?: string;
  userName?: string;
};

/** -------------------- Helpers -------------------- */
const STATUS_META: Record<string, { label: string; pill: string; cell: string }> = {
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
  EXPIRED: {
    label: "หมดอายุ",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
    cell: "bg-slate-200",
  },
  CANCELED: {
    label: "ยกเลิก",
    pill: "bg-rose-100 text-rose-700 border-rose-200",
    cell: "bg-rose-200",
  },
};

function statusCellColor(st?: string) {
  if (!st) return "bg-white";
  return STATUS_META[st]?.cell ?? "bg-violet-200";
}
function money(n?: number | null) {
  return Number(n || 0).toLocaleString("th-TH");
}
function authHeader() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
const addMinutes = (iso: string, m: number) =>
  new Date(new Date(iso).getTime() + m * 60000).toISOString();

// ใช้คำนวณ end เมื่อแถวไม่มี end
const DEFAULT_DURATION_MIN = 30;
const ensureEnd = (startIso: string, endIso?: string) =>
  endIso || addMinutes(startIso, DEFAULT_DURATION_MIN);

/** -------------------- Page -------------------- */
export default function SchedulePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [step, setStep] = useState(30);
  const [rows, setRows] = useState<ResvRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ออเดอร์ทั้งวัน
  const [dayOrders, setDayOrders] = useState<DayOrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // filters
  const [qTable, setQTable] = useState("");
  const [showStatus, setShowStatus] = useState<Record<string, boolean>>({
    PENDING_OTP: true,
    OTP_VERIFIED: true,
    AWAITING_PAYMENT: true,
    CONFIRMED: true,
    EXPIRED: true,
    CANCELED: false,
  });

  // dialog (slot/detail)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<{ tableId: number; slotIdx: number } | null>(null);

  // reservation detail pane
  const [activeResv, setActiveResv] = useState<ReservationDetail | null>(null);
  const [activePayment, setActivePayment] = useState<PaymentRow | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<"info" | "order" | "payment">("info");
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

  /** ------------ fetch day ------------ */
  const fetchDay = useCallback(async (d: string) => {
    try {
      setLoading(true);
      const headers = { "Cache-Control": "no-store", ...authHeader() };
      const { data } = await axios.get(`${config.apiUrl}/reservation`, {
        params: { date: d, includeCanceled: 0 },
        headers,
      });
      setRows((data?.data ?? []) as ResvRow[]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchDay(date); }, [date, fetchDay]);

  /** ------------ fetch day orders (all) ------------ */
  const fetchDayOrders = useCallback(async (d: string, baseRows: ResvRow[]) => {
    setOrdersLoading(true);
    const headers = { "Cache-Control": "no-store", ...authHeader() };

    try {
      // ลอง endpoint ตรง /orders?date= ก่อน
      let orders: OrderRow[] | null = null;
      try {
        const { data } = await axios.get(`${config.apiUrl}/orders`, { params: { date: d }, headers });
        orders = (data?.data ?? null) as OrderRow[] | null;
      } catch {
        // ไม่เป็นไร ใช้ fallback ด้านล่าง
      }

      if (!orders) {
        const ids = Array.from(new Set(baseRows.map((r: any) => r.orderId).filter(Boolean))) as number[];
        const list = await Promise.all(
          ids.map((id) =>
            axios.get(`${config.apiUrl}/orders/${id}`, { headers }).then((r) => r.data as OrderRow).catch(() => null)
          )
        );
        orders = (list.filter(Boolean) as OrderRow[]) || [];
      }

      const byOrderId = new Map<number, ResvRow>();
      baseRows.forEach((r: any) => { if (r.orderId) byOrderId.set(r.orderId, r); });

      const enriched: DayOrderRow[] = (orders || [])
        .map((o) => {
          const rr = byOrderId.get(o.id);
          return {
            ...o,
            reservationId: rr?.id,
            tableLabel: rr?.tableLabel,
            start: rr?.start,
            userName: rr?.user?.name,
          };
        })
        .sort((a, b) => {
          const ta = a.start ? +new Date(a.start) : 0;
          const tb = b.start ? +new Date(b.start) : 0;
          return ta - tb;
        });

      setDayOrders(enriched);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => { fetchDayOrders(date, rows); }, [date, rows, fetchDayOrders]);

  /** ------------ realtime ------------ */
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => { fetchDay(date); };
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

  /** ------------ filters ------------ */
  const filteredRows = useMemo(() => {
    const kw = qTable.trim().toLowerCase();
    return rows.filter((r) => {
      const passStatus = showStatus[r.status] ?? true;
      const passKw = !kw || (r.tableLabel || "").toLowerCase().includes(kw);
      return passStatus && passKw;
    });
  }, [rows, qTable, showStatus]);

  // เติม end เสมอสำหรับการวาง grid
  const normalizedRows = useMemo<ResvRow[]>(() => {
    return filteredRows.map((r) => ({
      ...r,
      end: ensureEnd(r.start, r.end),
    }));
  }, [filteredRows]);

  const grid = useMemo(
    () => buildDaySlots(normalizedRows as any, date, openTime, closeTime, step),
    [normalizedRows, date, openTime, closeTime, step]
  );

  /** ------------ summary ------------ */
  const summary = useMemo(() => {
    const total = filteredRows.length;
    const by = filteredRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    return { total, by };
  }, [filteredRows]);

  /** ------------ open slot detail ------------ */
  const openSlotDetail = (tableId: number, slotIdx: number) => {
    setDetail({ tableId, slotIdx });
    setDetailOpen(true);
    setActiveResv(null);
    setActiveOrder(null);
    setActivePayment(null);
  };

  /** ------------ สถานะพร้อม/ไม่พร้อม (อิง CONFIRMED) ------------ */
  const adminReadyInfo = useMemo(() => {
    if (!detail) return null;
    const now = new Date();
    const tableId = detail.tableId;

    const confirmed = rows
      .filter((r) => r.tableId === tableId && r.status === "CONFIRMED")
      .map((r) => {
        const start = new Date(r.start);
        const end = new Date(ensureEnd(r.start, r.end));
        return { start, end };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const iv of confirmed) {
      if (now >= iv.start && now < iv.end) {
        return { busy: true, readyAt: iv.end };
      }
    }
    return { busy: false, readyAt: now };
  }, [detail, rows]);

  /** ------------ load reservation detail ------------ */
  const loadReservationDetail = useCallback(
    async (resvId: number) => {
      try {
        setDetailLoading(true);
        setTab("info");
        setEditMode(false);
        setEditItems([]);

        const resv = await axios
          .get(`${config.apiUrl}/reservation/${resvId}`, {
            headers: { ...authHeader(), "Cache-Control": "no-store" },
          })
          .then((r) => r.data as ReservationDetail)
          .catch(() => null);

        const inRow = rows.find((r) => r.id === resvId);
        const merged: ReservationDetail | null = resv
          ? resv
          : inRow
          ? {
              id: inRow.id,
              userId: inRow.user.id,
              tableId: inRow.tableId,
              tableLabel: inRow.tableLabel,
              dateStart: inRow.start,
              dateEnd: ensureEnd(inRow.start, inRow.end),
              people: inRow.people,
              status: inRow.status,
              orderId: (inRow as any).orderId,
              paymentId: (inRow as any).paymentId,
              user: { id: inRow.user.id, name: inRow.user.name, phone: inRow.user.phone },
            }
          : null;

        setActiveResv(merged);

        if (merged?.paymentId) {
          const pay = await axios
            .get(`${config.apiUrl}/payment/${merged.paymentId}`, {
              headers: { ...authHeader(), "Cache-Control": "no-store" },
            })
            .then((r) => r.data as PaymentRow)
            .catch(() => null);
          setActivePayment(pay);
        } else setActivePayment(null);

        if (merged?.orderId) {
          const ord = await axios
            .get(`${config.apiUrl}/orders/${merged.orderId}`, {
              headers: { ...authHeader(), "Cache-Control": "no-store" },
            })
            .then((r) => r.data as OrderRow)
            .catch(() => null);
          setActiveOrder(ord);
          setEditItems(ord?.items ?? []);
        } else {
          setActiveOrder(null);
          setEditItems([]);
        }
      } finally {
        setDetailLoading(false);
      }
    },
    [rows]
  );

  /** ------------ actions (SweetAlert) ------------ */
  const confirmPayment = async () => {
    if (!activePayment?.id) return;
    try {
      await axios.post(
        `${config.apiUrl}/payment/${activePayment.id}/confirm`,
        {},
        { headers: { ...authHeader() } }
      );
      await loadReservationDetail(activeResv!.id);
      await fetchDay(date);
      await Swal.fire({ icon: "success", title: "ยืนยันรับชำระแล้ว", timer: 1400, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "ยืนยันชำระไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const saveEditedOrder = async () => {
    if (!activeOrder?.id) {
      await Swal.fire({ icon: "warning", title: "ไม่พบออเดอร์" });
      return;
    }
    try {
      await axios.patch(
        `${config.apiUrl}/orders/${activeOrder.id}`,
        { items: editItems.map(({ id, menuId, qty, note }) => ({ id, menuId, qty, note })) },
        { headers: { ...authHeader() } }
      );
      setEditMode(false);
      await loadReservationDetail(activeResv!.id);
      await fetchDay(date);
      await Swal.fire({ icon: "success", title: "บันทึกบิลสำเร็จ", timer: 1400, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "บันทึกบิลไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const cancelReservation = async () => {
    if (!activeResv?.id) return;
    const r = await Swal.fire({
      icon: "question",
      title: "ยืนยันยกเลิกการจองนี้?",
      showCancelButton: true,
      confirmButtonText: "ยกเลิก",
      cancelButtonText: "กลับ",
      confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;

    try {
      await axios.post(
        `${config.apiUrl}/reservations/${activeResv.id}/cancel`,
        {},
        { headers: { ...authHeader() } }
      );
      await fetchDay(date);
      setDetailOpen(false);
      await Swal.fire({ icon: "success", title: "ยกเลิกสำเร็จ", timer: 1400, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "ยกเลิกไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  /** ------------ UI ------------ */
  return (
    <main className="p-6 space-y-4">
      {/* Topbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">ตารางการจอง</h1>

        <div className="flex items-center gap-2 rounded-xl border bg-white px-2 py-1">
          <div className="relative">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 pr-9"
            />
            <IconCalendar className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
          </div>

          <select value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="h-9 rounded-md border px-2 text-sm">
            {["07:00", "08:00", "09:00", "10:00", "11:00"].map((t) => <option key={t} value={t}>เปิด {t}</option>)}
          </select>
          <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="h-9 rounded-md border px-2 text-sm">
            {["20:00", "21:00", "22:00", "23:00"].map((t) => <option key={t} value={t}>ปิด {t}</option>)}
          </select>
          <select value={step} onChange={(e) => setStep(parseInt(e.target.value, 10))} className="h-9 rounded-md border px-2 text-sm">
            {[15, 30, 60].map((m) => <option key={m} value={m}>{m} นาที/ช่อง</option>)}
          </select>

          <Button variant="outline" size="sm" className="h-9" onClick={() => fetchDay(date)}>
            <RefreshCw className="mr-2 h-4 w-4" /> รีเฟรช
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <Input placeholder="ค้นหาโต๊ะ…" className="h-9 w-44" value={qTable} onChange={(e) => setQTable(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const on = showStatus[key] ?? false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setShowStatus((p) => ({ ...p, [key]: !on }))}
                  className={cn("rounded-full border px-2.5 py-1 text-xs transition", on ? meta.pill : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
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
      <Card className="p-3 flex items-center gap-4 shadow-sm">
        <div className="text-sm text-slate-700">
          ทั้งหมด <span className="font-semibold">{summary.total}</span> รายการ
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(STATUS_META).map(([k, meta]) => (
            <span key={k} className={cn("rounded-full border px-2 py-0.5", meta.pill)}>
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
              {[...Array(4)].map((_, i) => (<div key={i} className="h-8 animate-pulse rounded bg-slate-100" />))}
            </div>
          </div>
        ) : grid.tables.length === 0 ? (
          <div className="p-10 text-center text-slate-500">ไม่มีข้อมูลการจองในวันที่เลือก</div>
        ) : (
          <div className="min-w-[1100px]">
            {/* header */}
            <div className="grid text-xs" style={{ gridTemplateColumns: `220px repeat(${grid.slots.length}, 1fr)` }}>
              <div className="sticky left-0 z-10 bg-white p-2 font-medium border-b rounded-l">โต๊ะ / เวลา</div>
              {grid.slots.map((s) => (
                <div key={s.idx} className="p-2 text-center border-b text-slate-600">
                  {s.label}
                </div>
              ))}
            </div>

            {/* rows */}
            {grid.tables.map((t, rowIdx) => (
              <div key={t.tableId} className="grid" style={{ gridTemplateColumns: `220px repeat(${grid.slots.length}, 1fr)` }}>
                <div className={cn("sticky left-0 z-10 p-2 border-b font-medium", rowIdx % 2 ? "bg-slate-50" : "bg-white")}>{t.label}</div>
                {grid.slots.map((s) => {
                  const st = (t as any).byStatus.get(s.idx) as string | undefined;
                  const title = st ? `${t.label} • ${s.label} — ${STATUS_META[st]?.label ?? st}` : `${t.label} • ${s.label}`;
                  return (
                    <button
                      key={s.idx}
                      title={title}
                      onClick={() => st && openSlotDetail(t.tableId as number, s.idx)}
                      className={cn(
                        "h-8 border-b border-r transition",
                        rowIdx % 2 ? "bg-slate-50/60" : "bg-white",
                        st && "outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-violet-400",
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
        <span>คลิกช่องสีเพื่อดูรายละเอียดการจอง (ใช้เวลาเริ่มของแต่ละรายการ)</span>
      </div>

      {/* ===== ตารางออเดอร์ทั้งหมดของวันนี้ ===== */}
      <Card className="p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">ออเดอร์ทั้งหมดของ {new Date(date).toLocaleDateString("th-TH")}</h2>
          <div className="text-xs text-slate-500">{ordersLoading ? "กำลังโหลด…" : `${dayOrders.length} ออเดอร์`}</div>
        </div>

        {ordersLoading ? (
          <div className="grid gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : dayOrders.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">ยังไม่มีออเดอร์ในวันนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 w-28">เวลา</th>
                  <th className="px-3 py-2 w-40">โต๊ะ</th>
                  <th className="px-3 py-2 w-48">ลูกค้า</th>
                  <th className="px-3 py-2">รายการ</th>
                  <th className="px-3 py-2 text-right w-32">รวม (บาท)</th>
                  <th className="px-3 py-2 w-32">สถานะบิล</th>
                  <th className="px-3 py-2 w-32">การทำงาน</th>
                </tr>
              </thead>
              <tbody>
                {dayOrders.map((o) => {
                  const timeLabel = o.start ? new Date(o.start).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-";
                  const itemsPreview = o.items.slice(0, 2).map((it) => `${it.name} x${it.qty}`).join(", ");
                  const more = o.items.length > 2 ? ` +${o.items.length - 2}` : "";
                  return (
                    <tr key={o.id} className="border-t">
                      <td className="px-3 py-2">{timeLabel}</td>
                      <td className="px-3 py-2">{o.tableLabel || "-"}</td>
                      <td className="px-3 py-2">{o.userName || "-"}</td>
                      <td className="px-3 py-2">{itemsPreview}{more}</td>
                      <td className="px-3 py-2 text-right">{money(o.total)}</td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs",
                          o.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : o.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {o.reservationId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setDetail(null);
                              setDetailOpen(true);
                              await loadReservationDetail(o.reservationId!);
                              setTab("order");
                            }}
                          >
                            ดูบิล
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              Swal.fire({
                                title: `บิล #${o.id}`,
                                html: `
                                  <div style="text-align:left">
                                    ${(o.items || [])
                                      .map((it) => `<div>${it.name} × ${it.qty} — ${money(it.price * it.qty)} บาท</div>`)
                                      .join("")}
                                    <hr />
                                    <div><b>รวม ${money(o.total)} บาท</b></div>
                                  </div>
                                `,
                                confirmButtonText: "ปิด",
                              })
                            }
                          >
                            ดูบิล
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl bg-white p-0 overflow-hidden rounded-2xl border">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base font-semibold">รายละเอียดการจองในช่วงเวลา</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4">
            {!detail ? (
              <div className="text-sm text-slate-500">ไม่มีข้อมูลช่องเวลา</div>
            ) : (
              <>
                <div className="mb-3 text-sm text-slate-700 flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span>ช่วงช่อง: {grid.slots[detail.slotIdx]?.label} – {grid.slots[detail.slotIdx + 1]?.label ?? closeTime}</span>
                </div>

                {adminReadyInfo && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 border",
                        adminReadyInfo.busy
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                    >
                      {adminReadyInfo.busy ? "ไม่พร้อม (มีการยืนยัน)" : "พร้อม (ไม่มีการยืนยันคาบนี้)"}
                    </span>
                    {adminReadyInfo.busy && adminReadyInfo.readyAt && (
                      <span className="text-slate-600">
                        พร้อมให้จองอีกครั้งประมาณ{" "}
                        {adminReadyInfo.readyAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}

                {/* รายการในช่อง */}
                {(() => {
                  const sl = grid.slots[detail.slotIdx];
                  if (!sl) return null;
                  const s = sl.start.getTime();
                  const e = sl.end.getTime();
                  const slotReservations = rows
                    .filter(
                      (r) =>
                        r.tableId === detail.tableId &&
                        new Date(r.start).getTime() >= s &&
                        new Date(r.start).getTime() < e
                    )
                    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

                  return slotReservations.length === 0 ? (
                    <div className="text-sm text-slate-500">ไม่มีการจองในช่องเวลานี้</div>
                  ) : (
                    <div className="space-y-2">
                      {slotReservations.map((r) => (
                        <div key={r.id} className="rounded-lg border p-3 hover:bg-slate-50 transition">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{r.user.name || `User #${r.user.id}`}</div>
                            <span className={cn("rounded-full border px-2 py-0.5 text-xs", STATUS_META[r.status]?.pill)}>
                              {STATUS_META[r.status]?.label ?? r.status}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <Users className="h-3.5 w-3.5" />
                            <span>{r.people} คน</span>
                            <Clock className="ml-2 h-3.5 w-3.5" />
                            <span>เริ่ม {new Date(r.start).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                            {r.user.phone ? <span className="ml-2">โทร {r.user.phone}</span> : null}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" onClick={async () => { await loadReservationDetail(r.id); setTab("info"); }}>
                              <Receipt className="mr-2 h-4 w-4" />
                              ดูรายละเอียด/บิล
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Drawer-like detail panel */}
            {activeResv && (
              <div className="mt-4 rounded-xl border bg-slate-50 p-3">
                {/* tabs */}
                <div className="flex items-center gap-2 mb-3">
                  <button className={cn("rounded-full px-3 py-1 text-xs border", tab === "info" ? "bg-white border-slate-300" : "bg-slate-100 border-transparent hover:bg-slate-200")} onClick={() => setTab("info")}>ข้อมูลการจอง</button>
                  <button className={cn("rounded-full px-3 py-1 text-xs border", tab === "order" ? "bg-white border-slate-300" : "bg-slate-100 border-transparent hover:bg-slate-200")} onClick={() => setTab("order")}>ออเดอร์/บิล</button>
                  <button className={cn("rounded-full px-3 py-1 text-xs border", tab === "payment" ? "bg-white border-slate-300" : "bg-slate-100 border-transparent hover:bg-slate-200")} onClick={() => setTab("payment")}>การชำระเงิน</button>
                  <div className="ml-auto text-xs text-slate-600">#{activeResv.id}</div>
                </div>

                {detailLoading ? (
                  <div className="p-6 text-sm text-slate-500">กำลังโหลด…</div>
                ) : tab === "info" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">ลูกค้า</div>
                      <div className="font-medium">{activeResv.user?.name || `User #${activeResv.userId}`}</div>
                      {activeResv.user?.phone ? <div className="text-slate-600">โทร {activeResv.user.phone}</div> : null}
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">โต๊ะ</div>
                      <div className="font-medium">{activeResv.tableLabel || activeResv.tableId || "-"}</div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">เวลาเริ่ม</div>
                      <div className="font-medium">
                        {new Date(activeResv.dateStart).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
                      </div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">โดยประมาณสิ้นสุด</div>
                      <div className="font-medium">
                        {new Date(ensureEnd(activeResv.dateStart, activeResv.dateEnd || undefined)).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">จำนวนคน</div>
                      <div className="font-medium">{activeResv.people}</div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">สถานะ</div>
                      <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-xs", STATUS_META[activeResv.status]?.pill)}>
                        {STATUS_META[activeResv.status]?.label || activeResv.status}
                      </span>
                    </div>

                    <div className="sm:col-span-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setTab("order")}>
                        <Receipt className="mr-2 h-4 w-4" /> ดูบิล/ออเดอร์
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setTab("payment")}>
                        <CircleDollarSign className="mr-2 h-4 w-4" /> ดูการชำระเงิน
                      </Button>
                      <Button variant="destructive" size="sm" className="ml-auto" onClick={cancelReservation}>
                        <Ban className="mr-2 h-4 w-4" /> ยกเลิกการจอง
                      </Button>
                    </div>
                  </div>
                ) : tab === "order" ? (
                  <div className="space-y-3">
                    {!activeOrder ? (
                      <div className="text-sm text-slate-500">ไม่มีออเดอร์ในรายการนี้</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">บิล #{activeOrder.id}</div>
                          <div className="flex gap-2">
                            {!editMode ? (
                              <Button size="sm" variant="outline" onClick={() => { setEditItems(activeOrder.items); setEditMode(true); }}>
                                <Pencil className="mr-2 h-4 w-4" /> แก้ไขบิล
                              </Button>
                            ) : (
                              <>
                                <Button size="sm" onClick={saveEditedOrder} className="bg-emerald-600 hover:bg-emerald-700">
                                  <Save className="mr-2 h-4 w-4" /> บันทึกบิล
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditItems(activeOrder.items); setEditMode(false); }}>ยกเลิก</Button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-white overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr className="text-left">
                                <th className="px-3 py-2 w-10">#</th>
                                <th className="px-3 py-2">รายการ</th>
                                <th className="px-3 py-2 text-right">ต่อหน่วย</th>
                                <th className="px-3 py-2 text-center w-28">จำนวน</th>
                                <th className="px-3 py-2 text-right">รวม</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(editMode ? editItems : activeOrder.items).map((it, idx) => (
                                <tr key={it.id} className="border-t">
                                  <td className="px-3 py-2">{idx + 1}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium">{it.name}</div>
                                    {it.note ? <div className="text-xs text-slate-500">โน้ต: {it.note}</div> : null}
                                  </td>
                                  <td className="px-3 py-2 text-right">{money(it.price)}</td>
                                  <td className="px-3 py-2 text-center">
                                    {editMode ? (
                                      <div className="inline-flex items-center gap-2">
                                        <button className="h-7 w-7 rounded border bg-slate-50" onClick={() => setEditItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>-</button>
                                        <Input type="number" value={it.qty} onChange={(e) => setEditItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: Math.max(1, Number(e.target.value || 1)) } : x))} className="h-7 w-16 text-center" />
                                        <button className="h-7 w-7 rounded border bg-slate-50" onClick={() => setEditItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: x.qty + 1 } : x))}>+</button>
                                      </div>
                                    ) : it.qty}
                                  </td>
                                  <td className="px-3 py-2 text-right">{money(it.price * it.qty)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="text-right text-sm">
                          รวมทั้งสิ้น <b>{money((editMode ? editItems : activeOrder.items).reduce((a, c) => a + c.price * c.qty, 0))} บาท</b>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!activePayment ? (
                      <div className="text-sm text-slate-500">ยังไม่มีข้อมูลการชำระเงิน</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">การชำระเงิน #{activePayment.id}</div>
                          <span className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            activePayment.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : activePayment.status === "SUBMITTED"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : activePayment.status === "PENDING"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {activePayment.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="rounded-md bg-white border p-3">
                            <div className="text-slate-500">ยอด</div>
                            <div className="font-medium">{money(activePayment.amount)} บาท</div>
                          </div>
                          <div className="rounded-md bg-white border p-3">
                            <div className="text-slate-500">หมดอายุ QR</div>
                            <div className="font-medium">
                              {activePayment.expiresAt ? new Date(activePayment.expiresAt).toLocaleString("th-TH") : "-"}
                            </div>
                          </div>
                        </div>

                        {/* รูปสลิป */}
                        {activePayment.slipImage ? (
                          <div className="rounded-md border bg-white p-3">
                            <div className="text-sm font-medium mb-2">สลิปที่อัปโหลด</div>
                            <a href={activePayment.slipImage} target="_blank" rel="noreferrer" className="block">
                              <Image
                                src={activePayment.slipImage}
                                alt="slip"
                                width={600}
                                height={800}
                                className="w-full max-w-sm rounded border h-auto"
                              />
                            </a>
                            <div className="text-xs text-slate-500 mt-2">คลิกเพื่อเปิดภาพเต็มในแท็บใหม่</div>
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmPayment} disabled={activePayment.status === "PAID"}>
                            ยืนยันรับชำระ
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => loadReservationDetail(activeResv!.id)}>
                            รีเฟรชสถานะ
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
