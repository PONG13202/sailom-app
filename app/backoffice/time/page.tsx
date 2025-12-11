// C:\Users\pong1\OneDrive\เอกสาร\End-Pro\sailom\app\backoffice\time\page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  orderId?: number | null;
  paymentId?: number | null;
  depositAmount?: number;
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
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "RESERVATION_ONLY";
  items: OrderItem[];
  paymentId?: number | null;
};

type ReservationDetail = {
  id: number;
  userId: number;
  tableId: number | null;
  tableLabel?: string | null;
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

// ---- Thai timezone helpers ----
const TZ = "Asia/Bangkok";
const TH_OFFSET = "+07:00";

// ปฏิทิน "สากล (Gregorian)" + โซนไทย
const fmt = {
  time: (v: string | number | Date) =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: TZ,
    }).format(new Date(v)),
  date: (v: string | number | Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: TZ,
    }).format(new Date(v)),
  datetime: (v: string | number | Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: TZ,
    }).format(new Date(v)),
  dmySpaces: (v: string | number | Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: TZ,
    })
      .format(new Date(v))
      .replace(/\//g, " "),
};

// YYYY-MM-DD ตามโซนไทย (ใช้กับ input type="date" และ API)
const thaiYMD = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// ให้ได้ epoch ของ "วันที่เลือก + เวลา HH:mm" ในโซนไทย
const thBoundaryMs = (dateStr: string, hhmm: string) =>
  +new Date(`${dateStr}T${hhmm}:00${TH_OFFSET}`);

// เช็คว่า ISO นี้ “เป็นวันเดียวกัน” กับ dateStr เมื่อมองในโซนไทย
const isSameThaiDate = (iso: string, dateStr: string) => {
  const d = new Date(iso);
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return ymd === dateStr;
};

// ปัดลง/ปัดขึ้นตาม step (นาที)
const floorToStep = (d: Date, step: number) => {
  const m = Math.floor(d.getMinutes() / step) * step;
  d.setMinutes(m, 0, 0);
  return d;
};
const ceilToStep = (d: Date, step: number) => {
  const m = Math.ceil(d.getMinutes() / step) * step;
  d.setMinutes(m, 0, 0);
  return d;
};
const toHHmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

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

const DEFAULT_DURATION_MIN = 30;
const ensureEnd = (startIso: string, endIso?: string | null) =>
  endIso || addMinutes(startIso, DEFAULT_DURATION_MIN);
// --- NEW: time helpers for editable start/end ---
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const hhmmValid = (s?: string | null) => !!(s && HHMM_RE.test(s.trim()));
const clampToDay = (d: Date) => {
  // จำกัดภายในวันเดียวกัน (00:00 - 23:59)
  const x = new Date(d);
  if (x.getHours() > 23 || (x.getHours() === 23 && x.getMinutes() > 59)) {
    x.setHours(23, 59, 0, 0);
  }
  if (x.getHours() < 0 || (x.getHours() === 0 && x.getMinutes() < 0)) {
    x.setHours(0, 0, 0, 0);
  }
  return x;
};

const fromThaiYmdHhmm = (ymd: string, hhmm: string) =>
  new Date(`${ymd}T${hhmm}:00${TH_OFFSET}`);

const toThaiYmd = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));

/** -------------------- Page -------------------- */
export default function SchedulePage() {
  // ตั้งค่า date เป็นวันไทยจริง (ไม่โดน UTC)
  const [date, setDate] = useState<string>("");
  useEffect(() => {
    const ymd = thaiYMD(new Date());
    setDate(ymd);
    latestDateRef.current = ymd;
  }, []);

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
  // --- NEW: editable reservation time state ---
const [editTime, setEditTime] = useState<{ start: string; end: string } | null>(null);
const [timeDirty, setTimeDirty] = useState(false);

useEffect(() => {
  // เมื่อเปิดรายละเอียด/โหลดสำเร็จ ให้ sync ค่าเวลาเริ่ม-สิ้นสุด
  if (!activeResv) {
    setEditTime(null);
    setTimeDirty(false);
    return;
  }
  const start = toHHmm(new Date(activeResv.dateStart));
  const end = toHHmm(new Date(ensureEnd(activeResv.dateStart, activeResv.dateEnd || undefined)));
  setEditTime({ start, end });
  setTimeDirty(false);
}, [activeResv]);


  // --- refs สำหรับ silent refresh / throttle / latest date
  const mountedRef = useRef(true);
  const latestDateRef = useRef(date);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imgUrl = (u?: string | null) => {
    if (!u) return "";
    if (u.startsWith("http") || u.startsWith("data:")) return u;
    return `${config.apiUrl}${u.startsWith("/") ? u : `/${u}`}`;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  // sync latest date
  useEffect(() => {
    if (date) latestDateRef.current = date;
  }, [date]);

  // ถ้ามีการจองอยู่นอกช่วง ให้ขยายช่วงเวลา (อิงโซนไทย)
  useEffect(() => {
    if (loading || !date) return;
    const dayRows = rows.filter((r) => isSameThaiDate(r.start, date));
    if (dayRows.length === 0) return;

    const earliestMs = Math.min(...dayRows.map((r) => +new Date(r.start)));
    const latestEndMs = Math.max(
      ...dayRows.map((r) => +new Date(ensureEnd(r.start, r.end)))
    );

    const curOpenMs = thBoundaryMs(date, openTime);
    const curCloseMs = thBoundaryMs(date, closeTime);

    let nextOpen = openTime;
    let nextClose = closeTime;

    if (earliestMs < curOpenMs) nextOpen = toHHmm(floorToStep(new Date(earliestMs), step));
    if (latestEndMs > curCloseMs) nextClose = toHHmm(ceilToStep(new Date(latestEndMs), step));

    if (nextOpen !== openTime) setOpenTime(nextOpen);
    if (nextClose !== closeTime) setCloseTime(nextClose);
  }, [rows, date, step, loading, openTime, closeTime]);

  /** ------------ fetch day + orders (ควบคุม spinner) ------------ */
  const fetchDayOrders = useCallback(
    async (d: string, baseRows: ResvRow[], showSpinner: boolean) => {
      const reservationOnly: DayOrderRow[] = (baseRows || [])
        .filter((r) => !r.orderId)
        .map((r) => ({
          id: -r.id,
          total: r.depositAmount ?? 0,
          status: "RESERVATION_ONLY" as any,
          items: [],
          paymentId: r.paymentId ?? null,
          reservationId: r.id,
          tableLabel: r.tableLabel,
          start: r.start,
          userName: r.user?.name,
        }));

      if (showSpinner) setOrdersLoading(true);
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};

      try {
        let orders: OrderRow[] | null = null;
        try {
          const { data } = await axios.get(`${config.apiUrl}/orders`, {
            params: { date: d },
            headers,
          });
          orders = (data?.data ?? null) as OrderRow[] | null;
        } catch {}

        if (!orders) {
          const ids = Array.from(new Set(baseRows.map((r) => r.orderId).filter(Boolean))) as number[];
          const list = await Promise.all(
            ids.map((id) =>
              axios
                .get(`${config.apiUrl}/orders/${id}`, { headers })
                .then((r) => r.data as OrderRow)
                .catch(() => null)
            )
          );
          orders = (list.filter(Boolean) as OrderRow[]) || [];
        }

        const byOrderId = new Map<number, ResvRow>();
        baseRows.forEach((r) => {
          if (r.orderId) byOrderId.set(r.orderId, r);
        });

        const enriched: DayOrderRow[] = [
          ...(orders || []).map((o) => {
            const rr = o.id ? byOrderId.get(o.id) : undefined;
            return {
              ...o,
              reservationId: rr?.id,
              tableLabel: rr?.tableLabel,
              start: rr?.start,
              userName: rr?.user?.name,
            };
          }),
          ...reservationOnly,
        ].sort((a, b) => {
          const ta = a.start ? +new Date(a.start) : 0;
          const tb = b.start ? +new Date(b.start) : 0;
          return ta - tb;
        });

        if (mountedRef.current) setDayOrders(enriched);
      } finally {
        if (showSpinner && mountedRef.current) setOrdersLoading(false);
      }
    },
    []
  );

  const fetchDay = useCallback(
    async (d: string, opts?: { showSpinner?: boolean }) => {
      if (!d) return;
      const showSpinner = opts?.showSpinner !== false;
      if (showSpinner) setLoading(true);
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};

      try {
        const { data } = await axios.get(`${config.apiUrl}/reservation`, {
          params: { date: d, includeCanceled: 0 },
          headers,
        });
        const list = (data?.data ?? []) as ResvRow[];
        if (mountedRef.current) setRows(list);
        await fetchDayOrders(d, list, showSpinner);
      } finally {
        if (showSpinner && mountedRef.current) setLoading(false);
      }
    },
    [fetchDayOrders]
  );

  // ครั้งแรก & เวลาเปลี่ยนวัน → ใช้ spinner
  useEffect(() => {
    if (date) fetchDay(date, { showSpinner: true });
  }, [date, fetchDay]);

  /** ------------ realtime (socket) เงียบๆไม่กระพริบ ------------ */
  const throttledSilentRefresh = useCallback(() => {
    if (throttleTimerRef.current) return;
    throttleTimerRef.current = setTimeout(async () => {
      throttleTimerRef.current = null;
      const d = latestDateRef.current;
      await fetchDay(d, { showSpinner: false });
    }, 250);
  }, [fetchDay]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handler = () => throttledSilentRefresh();
    const events = [
      "reservation:created",
      "reservation:updated",
      "reservation:confirmed",
      "reservation:expired",
      "reservation:canceled",
      "payment:succeeded",
    ] as const;
    events.forEach((ev) => socket.on(ev, handler));
    return () => {
      events.forEach((ev) => socket.off(ev, handler));
    };
  }, [throttledSilentRefresh]);

  /** ------------ filters ------------ */
  const filteredRows = useMemo(() => {
    const kw = qTable.trim().toLowerCase();
    return rows.filter((r) => {
      const passStatus = showStatus[r.status] ?? true;
      const passKw = !kw || (r.tableLabel || "").toLowerCase().includes(kw);
      return passStatus && passKw;
    });
  }, [rows, qTable, showStatus]);

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
        setEditMode(false);
        setEditItems([]);
        setActiveOrder(null);
        setActivePayment(null);

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
              orderId: inRow.orderId ?? null,
              paymentId: inRow.paymentId ?? null,
              user: {
                id: inRow.user.id,
                name: inRow.user.name,
                phone: inRow.user.phone ?? null,
                email: null,
              },
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
        }

        if (merged?.orderId) {
          const ord = await axios
            .get(`${config.apiUrl}/orders/${merged.orderId}`, {
              headers: { ...authHeader(), "Cache-Control": "no-store" },
            })
            .then((r) => r.data as OrderRow)
            .catch(() => null);
          setActiveOrder(ord);
          setEditItems(ord?.items ?? []);
        }
      } finally {
        if (mountedRef.current) setDetailLoading(false);
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
      await fetchDay(latestDateRef.current, { showSpinner: false });
      await Swal.fire({
        icon: "success",
        title: "ยืนยันรับชำระแล้ว",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e: any) {
      await Swal.fire({
        icon: "error",
        title: "ยืนยันชำระไม่สำเร็จ",
        text: e?.response?.data?.message || "",
      });
    }
  };

  const confirmReservationDirect = async () => {
    if (!activeResv?.id) return;

    const ok = await Swal.fire({
      icon: "question",
      title: "ยืนยันการจองโต๊ะนี้?",
      text: "กรณีนี้จะยืนยันโดยไม่ผูกกับบิลอาหาร",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });
    if (!ok.isConfirmed) return;

    try {
      await axios.post(
        `${config.apiUrl}/reservations/${activeResv.id}/confirm`,
        {},
        { headers: { ...authHeader() } }
      );
      await loadReservationDetail(activeResv.id);
      await fetchDay(latestDateRef.current, { showSpinner: false });
      await Swal.fire({
        icon: "success",
        title: "ยืนยันการจองแล้ว",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (e: any) {
      await Swal.fire({
        icon: "error",
        title: "ยืนยันไม่สำเร็จ",
        text: e?.response?.data?.message || "",
      });
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
      await fetchDay(latestDateRef.current, { showSpinner: false });
      await Swal.fire({
        icon: "success",
        title: "บันทึกบิลสำเร็จ",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e: any) {
      await Swal.fire({
        icon: "error",
        title: "บันทึกบิลไม่สำเร็จ",
        text: e?.response?.data?.message || "",
      });
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
      await fetchDay(latestDateRef.current, { showSpinner: false });
      setDetailOpen(false);
      await Swal.fire({
        icon: "success",
        title: "ยกเลิกสำเร็จ",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (e: any) {
      await Swal.fire({
        icon: "error",
        title: "ยกเลิกไม่สำเร็จ",
        text: e?.response?.data?.message || "",
      });
    }
  };
  // --- NEW: adjust & save functions ---
const adjustEnd = (deltaMin: number) => {
  setEditTime((prev) => {
    if (!prev) return prev;
    if (!hhmmValid(prev.end)) return prev;

    const baseYmd = activeResv ? toThaiYmd(activeResv.dateStart) : date;
    const endDt = fromThaiYmdHhmm(baseYmd, prev.end);
    endDt.setMinutes(endDt.getMinutes() + deltaMin);
    const startDt = fromThaiYmdHhmm(baseYmd, prev.start);

    // จำกัดไม่ให้น้อยกว่า start และไม่เกินภายในวัน
    const clamped = clampToDay(endDt);
    if (clamped.getTime() <= startDt.getTime()) clamped.setTime(startDt.getTime());

    setTimeDirty(true);
    return { ...prev, end: toHHmm(clamped) };
  });
};

const adjustStart = (deltaMin: number) => {
  // (เผื่ออนาคตอยากเพิ่มปุ่มขยับเวลาเริ่ม)
  setEditTime((prev) => {
    if (!prev) return prev;
    if (!hhmmValid(prev.start)) return prev;

    const baseYmd = activeResv ? toThaiYmd(activeResv.dateStart) : date;
    const startDt = fromThaiYmdHhmm(baseYmd, prev.start);
    startDt.setMinutes(startDt.getMinutes() + deltaMin);
    const endDt = fromThaiYmdHhmm(baseYmd, prev.end);

    const clamped = clampToDay(startDt);
    // ไม่ให้เกิน end
    if (clamped.getTime() >= endDt.getTime()) {
      endDt.setTime(clamped.getTime());
    }

    setTimeDirty(true);
    return { start: toHHmm(clamped), end: toHHmm(endDt) };
  });
};

const timeError = useMemo(() => {
  // ยังไม่มีข้อมูล -> ไม่แสดง error
  if (!activeResv || !editTime) return "";

  // รูปแบบเวลาให้ถูกก่อน
  if (!hhmmValid(editTime.start) || !hhmmValid(editTime.end)) {
    return "รูปแบบเวลาไม่ถูกต้อง (เช่น 09:30)";
  }

  // วันอ้างอิงตามโซนไทยของรายการนี้
  const baseYmd = toThaiYmd(activeResv.dateStart);

  // เช็กขอบเปิด–ปิดที่ UI เลือกไว้
  const openMs = thBoundaryMs(baseYmd, openTime);
  const closeMs = thBoundaryMs(baseYmd, closeTime);

  const s = fromThaiYmdHhmm(baseYmd, editTime.start);
  const e = fromThaiYmdHhmm(baseYmd, editTime.end);

  if (s.getTime() < openMs) return "เวลาเริ่มก่อนเวลาเปิด";
  if (e.getTime() > closeMs) return "เวลาสิ้นสุดเกินเวลาเปิดทำการ";
  if (e.getTime() <= s.getTime()) return "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม";

  return "";
}, [activeResv, editTime, openTime, closeTime]);


const resetEditedTime = () => {
  if (!activeResv) return;
  const s = toHHmm(new Date(activeResv.dateStart));
  const e = toHHmm(new Date(ensureEnd(activeResv.dateStart, activeResv.dateEnd || undefined)));
  setEditTime({ start: s, end: e });
  setTimeDirty(false);
};

const saveEditedTime = async () => {
  if (!activeResv || !editTime) return;
  if (timeError) {
    await Swal.fire({ icon: "warning", title: timeError });
    return;
  }
  const baseYmd = toThaiYmd(activeResv.dateStart);
  const newStartIso = `${baseYmd}T${editTime.start}:00${TH_OFFSET}`;
  const newEndIso   = `${baseYmd}T${editTime.end}:00${TH_OFFSET}`;

  try {
    await axios.patch(
      `${config.apiUrl}/reservations/${activeResv.id}`,
      { dateStart: newStartIso, dateEnd: newEndIso },
      { headers: { ...authHeader() } }
    );
    await loadReservationDetail(activeResv.id);
    await fetchDay(latestDateRef.current, { showSpinner: false });
    setTimeDirty(false);
    await Swal.fire({ icon: "success", title: "บันทึกเวลาเรียบร้อย", timer: 1200, showConfirmButton: false });
  } catch (e: any) {
    await Swal.fire({
      icon: "error",
      title: "บันทึกเวลาไม่สำเร็จ",
      text: e?.response?.data?.message || "",
    });
  }
};


  /** ------------ UI ------------ */
  return (
    <main className="p-4 sm:p-5 md:p-6 space-y-4 max-w-screen-2xl mx-auto">
      {/* Topbar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-lg sm:text-xl font-semibold">ตารางการจอง</h1>

        <div className="flex items-center gap-2 rounded-xl border bg-white px-2 py-1">
          <div className="relative">
            <Input
              type="date"
              lang="en-GB" // บังคับแสดง dd/mm/yyyy (Gregorian) ใน date picker
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 sm:h-9 pr-8 text-sm"
            />
            <IconCalendar className="absolute right-2 top-2 h-4 w-4 text-slate-500" />
          </div>

          <select
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="h-8 sm:h-9 rounded-md border px-2 text-sm"
          >
            {Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`).map((t) => (
              <option key={t} value={t}>
                เปิด {t}
              </option>
            ))}
          </select>

          <select
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="h-8 sm:h-9 rounded-md border px-2 text-sm"
          >
            {Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`).map((t) => (
              <option key={t} value={t}>
                ปิด {t}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-9"
            onClick={() => fetchDay(date, { showSpinner: true })}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> รีเฟรช
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <Input
            placeholder="ค้นหาโต๊ะ…"
            className="h-8 sm:h-9 w-40 sm:w-44"
            value={qTable}
            onChange={(e) => setQTable(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const on = showStatus[key] ?? false;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setShowStatus((p) => ({ ...p, [key]: !on }))}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] sm:text-xs transition",
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
      <Card className="p-2 sm:p-3 overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-8">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 grid gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-7 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </div>
        ) : grid.tables.length === 0 ? (
          <div className="p-8 text-center text-slate-500">ไม่มีข้อมูลการจองในวันที่เลือก</div>
        ) : (
          <div className="min-w-[720px]">
            {/* header */}
            <div
              className="grid text-[11px] sm:text-xs"
              style={{ gridTemplateColumns: `160px repeat(${grid.slots.length}, 1fr)` }}
            >
              <div className="sticky left-0 z-10 bg-white p-2 font-medium border-b rounded-l">
                โต๊ะ / เวลา
              </div>
              {grid.slots.map((s) => (
                <div key={s.idx} className="p-2 text-center border-b text-slate-600">
                  {s.label}
                </div>
              ))}
            </div>

            {/* rows */}
            {grid.tables.map((t, rowIdx) => (
              <div
                key={t.tableId}
                className="grid"
                style={{ gridTemplateColumns: `160px repeat(${grid.slots.length}, 1fr)` }}
              >
                <div
                  className={cn(
                    "sticky left-0 z-10 p-2 border-b font-medium text-sm",
                    rowIdx % 2 ? "bg-slate-50" : "bg-white"
                  )}
                >
                  {t.label}
                </div>
                {grid.slots.map((s) => {
                  const st = (t as any).byStatus.get(s.idx) as string | undefined;
                  const title = st
                    ? `${t.label} • ${s.label} — ${STATUS_META[st]?.label ?? st}`
                    : `${t.label} • ${s.label}`;
                  return (
                    <button
                      key={s.idx}
                      title={title}
                      onClick={() => st && openSlotDetail(t.tableId as number, s.idx)}
                      className={cn(
                        "h-7 sm:h-8 border-b border-r transition",
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
        <span>คลิกช่องสีเพื่อดูรายละเอียดการจอง (ใช้เวลาเริ่มของแต่ละรายการ)</span>
      </div>

      {/* ===== ตารางออเดอร์ทั้งหมดของวันนี้ ===== */}
      <Card className="p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            ออเดอร์ทั้งหมดของ{" "}
            {fmt.dmySpaces(new Date(`${date || thaiYMD(new Date())}T00:00:00${TH_OFFSET}`))}
          </h2>
          <div className="text-xs text-slate-500">
            {ordersLoading ? "กำลังโหลด…" : `${dayOrders.length} ออเดอร์`}
          </div>
        </div>

        {ordersLoading ? (
          <div className="grid gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : dayOrders.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">ยังไม่มีออเดอร์ในวันนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 w-24">เวลา</th>
                  <th className="px-3 py-2 w-36">โต๊ะ</th>
                  <th className="px-3 py-2 w-44">ลูกค้า</th>
                  <th className="px-3 py-2">รายการ</th>
                  <th className="px-3 py-2 text-right w-28">รวม (บาท)</th>
                  <th className="px-3 py-2 w-28">สถานะบิล</th>
                  <th className="px-3 py-2 w-28">การทำงาน</th>
                </tr>
              </thead>
              <tbody>
                {dayOrders.map((o) => {
                  const timeLabel = o.start ? fmt.time(o.start) : "-";
                  const itemsPreview = o.items
                    .slice(0, 2)
                    .map((it) => `${it.name} x${it.qty}`)
                    .join(", ");
                  const more = o.items.length > 2 ? ` +${o.items.length - 2}` : "";
                  return (
                    <tr key={o.id} className="border-t">
                      <td className="px-3 py-2">{timeLabel}</td>
                      <td className="px-3 py-2">{o.tableLabel || "-"}</td>
                      <td className="px-3 py-2">{o.userName || "-"}</td>
                      <td className="px-3 py-2">
                        {itemsPreview}
                        {more}
                      </td>
                      <td className="px-3 py-2 text-right">{money(o.total)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            o.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : o.status === "PENDING"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : o.status === "RESERVATION_ONLY"
                              ? "bg-violet-100 text-violet-700 border-violet-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {o.status === "RESERVATION_ONLY" ? "จองโต๊ะ" : o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {o.reservationId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setDetail({ tableId: 0, slotIdx: 0 });
                              setDetailOpen(true);
                              await loadReservationDetail(o.reservationId!);
                              setTab(o.status === "RESERVATION_ONLY" ? "payment" : "order");
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
                                      .map(
                                        (it) =>
                                          `<div>${it.name} × ${it.qty} — ${money(
                                            it.price * it.qty
                                          )} บาท</div>`
                                      )
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
      <Dialog open={detailOpen} onOpenChange={setDetailOpen} modal={false}>
        <DialogContent className="sm:max-w-[720px] bg-white p-0 overflow-hidden rounded-2xl border">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base font-semibold">
              รายละเอียดการจองในช่วงเวลา
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4">
            {!detail ? (
              <div className="text-sm text-slate-500">ไม่มีข้อมูลช่องเวลา</div>
            ) : (
              <>
                <div className="mb-3 text-sm text-slate-700 flex items-center gap-3">
                  <Clock className="h-4 w-4" />
                  <span>
                    ช่วงช่อง: {grid.slots[detail.slotIdx]?.label} –{" "}
                    {grid.slots[detail.slotIdx + 1]?.label ?? closeTime}
                  </span>
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
                      {adminReadyInfo.busy
                        ? "ไม่พร้อม (มีการยืนยัน)"
                        : "พร้อม (ไม่มีการยืนยันคาบนี้)"}
                    </span>
                    {adminReadyInfo.busy && adminReadyInfo.readyAt && (
                      <span className="text-slate-600">
                        พร้อมให้จองอีกครั้งประมาณ {fmt.time(adminReadyInfo.readyAt)}
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
                        <div
                          key={r.id}
                          className="rounded-lg border p-3 hover:bg-slate-50 transition"
                        >
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

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <Users className="h-3.5 w-3.5" />
                            <span>{r.people} คน</span>
                            <Clock className="ml-2 h-3.5 w-3.5" />
                            <span>เริ่ม {fmt.time(r.start)}</span>
                            {r.user.phone ? (
                              <span className="ml-2">โทร {r.user.phone}</span>
                            ) : null}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await loadReservationDetail(r.id);
                                setTab("info");
                              }}
                            >
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
                  <button
                    className={cn(
                      "rounded-full px-3 py-1 text-xs border",
                      tab === "info"
                        ? "bg-white border-slate-300"
                        : "bg-slate-100 border-transparent hover:bg-slate-200"
                    )}
                    onClick={() => setTab("info")}
                  >
                    ข้อมูลการจอง
                  </button>
                  <button
                    className={cn(
                      "rounded-full px-3 py-1 text-xs border",
                      tab === "order"
                        ? "bg-white border-slate-300"
                        : "bg-slate-100 border-transparent hover:bg-slate-200"
                    )}
                    onClick={() => setTab("order")}
                  >
                    ออเดอร์/บิล
                  </button>
                  <button
                    className={cn(
                      "rounded-full px-3 py-1 text-xs border",
                      tab === "payment"
                        ? "bg-white border-slate-300"
                        : "bg-slate-100 border-transparent hover:bg-slate-200"
                    )}
                    onClick={() => setTab("payment")}
                  >
                    การชำระเงิน
                  </button>
                  <div className="ml-auto text-xs text-slate-600">#{activeResv.id}</div>
                </div>

                {detailLoading ? (
                  <div className="p-6 text-sm text-slate-500">กำลังโหลด…</div>
                ) : tab === "info" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* --- NEW: Editable time section --- */}
<div className="sm:col-span-2 rounded-md bg-white border p-3">
  <div className="flex items-center gap-2 mb-2 text-sm font-medium">
    <Clock className="h-4 w-4" />
    <span>ปรับแต่งเวลาเริ่ม–สิ้นสุด</span>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
{/* เวลาเริ่ม */}
<div>
  <div className="text-xs text-slate-500 mb-1">เวลาเริ่ม</div>
  <div className="flex items-center gap-2">
    <Input
      type="time" min={openTime} max={closeTime}
      value={editTime?.start || ""}
      onChange={(e) => {
        const v = e.target.value;
        setEditTime((p) => (p ? { ...p, start: v } : p));
        setTimeDirty(true);
      }}
      className="h-9 flex-1"
    />
    <Button type="button" variant="outline" size="sm" onClick={() => adjustStart(-10)} className="h-9">
      –10 นาที
    </Button>
    <Button type="button" variant="outline" size="sm" onClick={() => adjustStart(30)} className="h-9">
      +30 นาที
    </Button>
  </div>
</div>


    <div>
      <div className="text-xs text-slate-500 mb-1">เวลาสิ้นสุด</div>
      <div className="flex items-center gap-2">
        <Input
          type="time" min={openTime} max={closeTime}
          value={editTime?.end || ""}
          onChange={(e) => {
            const v = e.target.value;
            setEditTime((p) => (p ? { ...p, end: v } : p));
            setTimeDirty(true);
          }}
          className="h-9 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="ลดเวลา 10 นาที"
          onClick={() => adjustEnd(-10)}
          className="h-9"
        >
          –10 นาที
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="เพิ่มเวลา 30 นาที"
          onClick={() => adjustEnd(30)}
          className="h-9"
        >
          +30 นาที
        </Button>
      </div>
    </div>
  </div>

  {timeError ? (
    <div className="mt-2 text-xs text-rose-600">{timeError}</div>
  ) : null}

  <div className="mt-3 flex gap-2">
    <Button
      type="button"
      onClick={saveEditedTime}
      disabled={!!timeError || !timeDirty}
      className="bg-emerald-600 hover:bg-emerald-700"
    >
      <Save className="mr-2 h-4 w-4" />
      บันทึกเวลา
    </Button>
    <Button type="button" variant="outline" onClick={resetEditedTime}>
      ยกเลิก
    </Button>
  </div>
</div>

                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">ลูกค้า</div>
                      <div className="font-medium">
                        {activeResv.user?.name || `User #${activeResv.userId}`}
                      </div>
                      {activeResv.user?.phone ? (
                        <div className="text-slate-600">โทร {activeResv.user.phone}</div>
                      ) : null}
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">โต๊ะ</div>
                      <div className="font-medium">
                        {activeResv.tableLabel || activeResv.tableId || "-"}
                      </div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">เวลาเริ่ม</div>
                      <div className="font-medium">{fmt.datetime(activeResv.dateStart)}</div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">โดยประมาณสิ้นสุด</div>
                      <div className="font-medium">
                        {fmt.time(ensureEnd(activeResv.dateStart, activeResv.dateEnd || undefined))}
                      </div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">จำนวนคน</div>
                      <div className="font-medium">{activeResv.people}</div>
                    </div>
                    <div className="rounded-md bg-white border p-3">
                      <div className="text-slate-500">สถานะ</div>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full border px-2 py-0.5 text-xs",
                          STATUS_META[activeResv.status]?.pill
                        )}
                      >
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
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-auto"
                        onClick={cancelReservation}
                      >
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditItems(activeOrder.items);
                                  setEditMode(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> แก้ไขบิล
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={saveEditedOrder}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Save className="mr-2 h-4 w-4" /> บันทึกบิล
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditItems(activeOrder.items);
                                    setEditMode(false);
                                  }}
                                >
                                  ยกเลิก
                                </Button>
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
                                    {it.note ? (
                                      <div className="text-xs text-slate-500">โน้ต: {it.note}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-3 py-2 text-right">{money(it.price)}</td>
                                  <td className="px-3 py-2 text-center">
                                    {editMode ? (
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          className="h-7 w-7 rounded border bg-slate-50"
                                          onClick={() =>
                                            setEditItems((prev) =>
                                              prev.map((x) =>
                                                x.id === it.id
                                                  ? { ...x, qty: Math.max(1, x.qty - 1) }
                                                  : x
                                              )
                                            )
                                          }
                                        >
                                          -
                                        </button>
                                        <Input
                                          type="number"
                                          value={it.qty}
                                          onChange={(e) =>
                                            setEditItems((prev) =>
                                              prev.map((x) =>
                                                x.id === it.id
                                                  ? {
                                                      ...x,
                                                      qty: Math.max(1, Number(e.target.value || 1)),
                                                    }
                                                  : x
                                              )
                                            )
                                          }
                                          className="h-7 w-16 text-center"
                                        />
                                        <button
                                          className="h-7 w-7 rounded border bg-slate-50"
                                          onClick={() =>
                                            setEditItems((prev) =>
                                              prev.map((x) =>
                                                x.id === it.id ? { ...x, qty: x.qty + 1 } : x
                                              )
                                            )
                                          }
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      it.qty
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {money(it.price * it.qty)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="text-right text-sm">
                          รวมทั้งสิ้น{" "}
                          <b>
                            {money(
                              (editMode ? editItems : activeOrder.items).reduce(
                                (a, c) => a + c.price * c.qty,
                                0
                              )
                            )}{" "}
                            บาท
                          </b>
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
                          <div className="text-sm font-medium">
                            การชำระเงิน #{activePayment.id}
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs",
                              activePayment.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : activePayment.status === "SUBMITTED"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : activePayment.status === "PENDING"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            )}
                          >
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
                              {activePayment.expiresAt ? fmt.datetime(activePayment.expiresAt) : "-"}
                            </div>
                          </div>
                        </div>

                        {activePayment.slipImage ? (
                          <div className="rounded-md border bg-white p-3">
                            <div className="text-sm font-medium mb-2">สลิปที่อัปโหลด</div>
                            <a
                              href={imgUrl(activePayment.slipImage)}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <Image
                                src={imgUrl(activePayment.slipImage)}
                                alt="slip"
                                width={50}
                                height={50}
                                sizes="100px"
                                className="rounded-md border object-contain cursor-zoom-in hover:opacity-90 transition"
                              />
                            </a>
                            <div className="text-xs text-slate-500 mt-2">
                              คลิกเพื่อเปิดภาพเต็มในแท็บใหม่
                            </div>
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          {activePayment ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={confirmPayment}
                              disabled={activePayment.status === "PAID"}
                            >
                              ยืนยันรับชำระ
                            </Button>
                          ) : (
                            !activeOrder &&
                            activeResv?.status !== "CONFIRMED" && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={confirmReservationDirect}
                              >
                                ยืนยันการจอง (ไม่รับมัดจำ)
                              </Button>
                            )
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadReservationDetail(activeResv!.id)}
                          >
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
