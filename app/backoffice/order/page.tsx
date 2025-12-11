// app/backoffice/order/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "@/app/config";
import { socket } from "@/app/socket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Buffer } from "buffer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
   FileDown,
  RefreshCw,
  Filter,
  Receipt,
  CheckCircle2,
  XCircle,
  Pencil,
  Save,
  Printer,
  CircleDollarSign,
  Calendar as IconCalendar,
  Search,
} from "lucide-react";

/** -------------------- Types -------------------- */
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
  userId: number;
  total: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED";
  items: OrderItem[];
  paymentId?: number | null;
  createdAt?: string;
  reservationId?: number | null;
  tableLabel?: string | null;
  start?: string | null;
  user?: {
    id: number;
    fname?: string | null;
    lname?: string | null;
    email?: string | null;
    phone?: string | null;
    img?: string | null;
  };
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

/** -------------------- Helpers -------------------- */
const money = (n?: number | null) => Number(n || 0).toLocaleString("th-TH");
const authHeader = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const fmtDT = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "-";
const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-";

const ORDER_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELED: "bg-rose-100 text-rose-700 border-rose-200",
};

const PAY_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  SUBMITTED: "bg-sky-100 text-sky-700 border-sky-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  EXPIRED: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELED: "bg-rose-100 text-rose-700 border-rose-200",
};
const userFullName = (u?: { fname?: string | null; lname?: string | null }) => {
  if (!u) return "-";
  return [u.fname, u.lname].filter(Boolean).join(" ").trim() || "-";
};

// ===== PDF helpers =====
const toTHDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-";

async function loadThaiFont(doc: any) {
  const res = await fetch("/fonts/Prompt-Regular.ttf");
  if (!res.ok) {
    console.error("ไม่พบไฟล์ฟอนต์", res.status);
    return;
  }
  const buf = await res.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");

  doc.addFileToVFS("Prompt-Regular.ttf", b64);
  doc.addFont("Prompt-Regular.ttf", "Prompt", "normal");
  doc.setFont("Prompt");
}

function moneyTH(n?: number | null) {
  return `${Number(n || 0).toLocaleString("th-TH")} บาท`;
}

// ===== สร้าง PDF พร้อมข้อมูลลูกค้า =====
async function downloadOrderPdf(order: OrderRow, pay: PaymentRow | null) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await loadThaiFont(doc);

  const M = 48;
  let y = 56;

  doc.setFontSize(16);
  doc.text("SaiLom — รายงานบิลสั่งอาหาร", M, y);
  y += 24;

  // กล่องข้อมูลบิล + ลูกค้า
  doc.setFontSize(11);
  doc.roundedRect(M, y, 520, 72, 6, 6, "S");
  let gy = y + 22;
  doc.text(`เลขที่บิล: #${order.id}`, M + 16, gy);          gy += 18;
  doc.text(`เวลา: ${toTHDateTime(order.createdAt || order.start)}`, M + 16, gy); gy += 18;
  doc.text(`โต๊ะ: ${order.tableLabel || "-"}`, M + 16, gy);

  let ry = y + 22;
  doc.text(`ชื่อลูกค้า: ${userFullName(order.user) || "User #" + order.userId}`, M + 280, ry); ry += 18;
  doc.text(`เบอร์: ${order.user?.phone || "-"}`, M + 280, ry);                   ry += 18;
  doc.text(`สถานะบิล: ${order.status}`, M + 280, ry);

  y += 96;

  // ตารางรายการ
  const rows = (order.items || []).map((it, i) => [
    String(i + 1),
    it.name + (it.note ? ` (โน้ต: ${it.note})` : ""),
    moneyTH(it.price),
    String(it.qty),
    moneyTH(it.price * it.qty),
  ]);

autoTable(doc, {
  startY: y,
  head: [["#", "รายการ", "ต่อหน่วย", "จำนวน", "รวม"]],
  body: rows,
  styles: {
    font: "Prompt",        // ใช้ Prompt ที่คุณโหลดมา
    fontSize: 11,
    cellPadding: 6,
  },
  headStyles: {
    fillColor: [241, 245, 249],
    textColor: [15, 23, 42],
    font: "Prompt",        // <<< ต้องใส่ตรงนี้ด้วย
    fontStyle: "normal"
  },
  bodyStyles: {
    font: "Prompt",        // <<< บังคับ body ใช้ Prompt ด้วย
    fontStyle: "normal"
  },
  columnStyles: {
    0: { halign: "center", cellWidth: 28 },
    1: { cellWidth: 290 },
    2: { halign: "right", cellWidth: 90 },
    3: { halign: "center", cellWidth: 60 },
    4: { halign: "right", cellWidth: 90 },
  },
  theme: "grid",
});

  const sum = (order.items || []).reduce((a, c) => a + c.price * c.qty, 0);
  let endY = (doc as any).lastAutoTable?.finalY || y;

  // สรุปยอด + สถานะชำระ
  endY += 16;
  doc.roundedRect(M, endY, 520, 70, 6, 6, "S");
  let sy = endY + 24;
  doc.text(`รวมทั้งสิ้น: ${moneyTH(sum)}`, M + 16, sy); sy += 18;
  if (pay) {
    doc.text(`สถานะชำระ: ${pay.status}`, M + 16, sy); sy += 18;
    if (pay.confirmedAt) doc.text(`ยืนยันเมื่อ: ${toTHDateTime(pay.confirmedAt)}`, M + 16, sy);
  } else {
    doc.text(`สถานะชำระ: -`, M + 16, sy);
  }

  doc.save(`Order_${order.id}.pdf`);
}


/** -------------------- Page -------------------- */
export default function BackofficeOrdersPage() {
  // ✅ แสดงทั้งหมดเป็นค่าเริ่มต้น: ไม่มีช่วงวันที่
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // client filters
  const [q, setQ] = useState("");
  // ✅ ค่าเริ่มต้นแสดงสถานะทุกแบบ
  const [showStatus, setShowStatus] = useState<Record<string, boolean>>({
    PENDING: true,
    CONFIRMED: true,
    CANCELED: true,
  });
  const [showPay, setShowPay] = useState<Record<string, boolean>>({
    PENDING: true,
    SUBMITTED: true,
    PAID: true,
    EXPIRED: true,
    CANCELED: true,
  });

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [paymentsMap, setPaymentsMap] = useState<Map<number, PaymentRow>>(new Map());

  // ✅ pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);

  // details dialog
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<OrderRow | null>(null);
  const [activePay, setActivePay] = useState<PaymentRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const imgUrl = (u?: string | null) => {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  return `${config.apiUrl}${u.startsWith("/") ? u : `/${u}`}`;
};
const canConfirmPay = (p?: PaymentRow | null) =>
  !!p && (p.status === "PENDING" || p.status === "SUBMITTED");

const confirmLabel = (p: PaymentRow) =>
  p.status === "SUBMITTED" ? "ยืนยันสลิป" : "รับชำระ";


  /** ---------- fetch list ---------- */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};

      // ถ้าผู้ใช้ปิดบาง status/payStatus → ส่งไปให้ backend filter เพื่อให้ pagination ตรง
      const enabledStatuses = Object.entries(showStatus).filter(([, v]) => v).map(([k]) => k);
      const enabledPays = Object.entries(showPay).filter(([, v]) => v).map(([k]) => k);

      const params: any = {
        // ถ้าว่าง ให้ undefined เพื่อไม่ส่ง query นั้น
        start: startDate || undefined,
        end: endDate || undefined,
        page,
        pageSize,
      };
      if (enabledStatuses.length > 0 && enabledStatuses.length < 3) {
        params.status = enabledStatuses.join(",");
      }
      if (enabledPays.length > 0 && enabledPays.length < 5) {
        params.payStatus = enabledPays.join(",");
      }

      const { data } = await axios.get(`${config.apiUrl}/orders`, { params, headers });

      const arr = ((data?.data ?? data ?? []) as OrderRow[]).map((o) => ({ ...o, items: o.items ?? [] }));
      setOrders(arr);

      // page info
      setTotal(Number(data?.paging?.total ?? arr.length));
      setPages(Number(data?.paging?.pages ?? 1));

      // preload payments map for list (optional)
      const ids = Array.from(new Set(arr.map((o) => o.paymentId).filter(Boolean))) as number[];
      if (ids.length) {
        const list = await Promise.all(
          ids.map((id) =>
            axios
              .get(`${config.apiUrl}/payment/${id}`, { headers })
              .then((r) => r.data as PaymentRow)
              .catch(() => null)
          )
        );
        const map = new Map<number, PaymentRow>();
        list.filter(Boolean).forEach((p: any) => map.set(p.id, p));
        setPaymentsMap(map);
      } else {
        setPaymentsMap(new Map());
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, pageSize, showStatus, showPay]);

  // โหลดเมื่อเปิดหน้า + เมื่อเปลี่ยน dependency ของ fetchOrders
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ถ้าเปลี่ยนช่วงวันที่หรือ filter → กลับไปหน้า 1
  useEffect(() => { setPage(1); }, [startDate, endDate, showStatus, showPay]);

  /** ---------- realtime ---------- */
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => fetchOrders();
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("payment:succeeded", refresh);
    socket.on("payment:updated", refresh);
    socket.on("payment:submitted", refresh);
    socket.on("payment:confirmed", refresh);
    socket.on("reservation:expired", refresh);
    return () => {
      socket.off("order:created", refresh);
      socket.off("order:updated", refresh);
      socket.off("payment:succeeded", refresh);
      socket.off("payment:updated", refresh);
      socket.off("payment:submitted", refresh);
      socket.off("payment:confirmed", refresh);
      socket.off("reservation:expired", refresh);
    };
  }, [fetchOrders]);

  /** ---------- list filters ---------- */
  // ฝั่ง server จัดการกรองด้วย status/pay แล้ว
  // ที่นี่กรองเฉพาะ keyword (ภายในหน้าปัจจุบัน)
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return orders;
    return orders.filter((o) => {
      const s = [
        `#${o.id}`,
        o.tableLabel || "",
        o.user?.fname || "",
        (o.items || []).map((it) => it.name).join(", "),
      ].join(" ").toLowerCase();
      return s.includes(kw);
    });
  }, [orders, q]);

  /** ---------- open detail ---------- */
  const openDetail = async (o: OrderRow) => {
    setOpen(true);
    setActive(null);
    setActivePay(null);
    setEditMode(false);
    setEditItems([]);
    setDetailLoading(true);
    try {
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};
      const ord = await axios.get(`${config.apiUrl}/orders/${o.id}`, { headers }).then((r) => r.data as OrderRow);
      setActive(ord);
      setEditItems(ord.items || []);
      if (ord.paymentId) {
        const p = await axios.get(`${config.apiUrl}/payment/${ord.paymentId}`, { headers }).then((r) => r.data as PaymentRow).catch(() => null);
        setActivePay(p);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  /** ---------- actions ---------- */
  const saveEditedOrder = async () => {
    if (!active?.id) return;
    try {
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};
      await axios.patch(`${config.apiUrl}/orders/${active.id}`, {
        items: editItems.map(({ id, menuId, qty, note }) => ({ id, menuId, qty, note })),
      }, { headers });
      setEditMode(false);
      await openDetail(active);
      await fetchOrders();
      await Swal.fire({ icon: "success", title: "บันทึกบิลสำเร็จ", timer: 1400, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "บันทึกบิลไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const changeOrderStatus = async (o: OrderRow, status: "CONFIRMED" | "CANCELED" | "PENDING") => {
    const title = status === "CONFIRMED" ? "ยืนยันบิลนี้?" : status === "CANCELED" ? "ยกเลิกบิลนี้?" : "เปลี่ยนเป็นร่าง (PENDING)?";
    const r = await Swal.fire({ icon: "question", title, showCancelButton: true, confirmButtonText: "ตกลง", cancelButtonText: "ยกเลิก" });
    if (!r.isConfirmed) return;
    try {
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};
      await axios.patch(`${config.apiUrl}/orders/${o.id}`, { status }, { headers });
      if (active?.id === o.id) setActive({ ...(active as OrderRow), status });
      await fetchOrders();
      await Swal.fire({ icon: "success", title: "อัปเดตสถานะสำเร็จ", timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "อัปเดตสถานะไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const confirmPayment = async (paymentId?: number | null) => {
    if (!paymentId) return;
    const r = await Swal.fire({ icon: "question", title: "ยืนยันรับชำระ?", showCancelButton: true, confirmButtonText: "ยืนยัน", cancelButtonText: "ย้อนกลับ" });
    if (!r.isConfirmed) return;
    try {
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};
      await axios.post(`${config.apiUrl}/payment/${paymentId}/confirm`, {}, { headers });
      if (active?.id) await openDetail(active);
      await fetchOrders();
      await Swal.fire({ icon: "success", title: "รับชำระแล้ว", timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "ยืนยันชำระไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const cancelPayment = async (paymentId?: number | null) => {
    if (!paymentId) return;
    const r = await Swal.fire({
      icon: "warning",
      title: "ยกเลิกการจ่าย?",
      text: "ยืนยันยกเลิกการชำระรายการนี้",
      showCancelButton: true,
      confirmButtonText: "ยกเลิกจ่าย",
      cancelButtonText: "ย้อนกลับ",
    });
    if (!r.isConfirmed) return;
    try {
      const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};
      await axios.post(`${config.apiUrl}/payment/${paymentId}/cancel`, {}, { headers });
      if (active?.id) await openDetail(active);
      await fetchOrders();
      await Swal.fire({ icon: "success", title: "ยกเลิกการจ่ายแล้ว", timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "ยกเลิกการจ่ายไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const printOrder = (o: OrderRow) => {
    const html = `
      <div>
        <h3>บิล #${o.id}</h3>
        <div>เวลา: ${fmtDT(o.createdAt || o.start)}</div>
        <div>ลูกค้า: ${o.user?.fname} ${o.user?.lname || "-"}</div>
        <div>โต๊ะ: ${o.tableLabel || "-"}</div>
        <hr />
        ${(o.items || [])
          .map((it, i) => `<div>${i + 1}. ${it.name} × ${it.qty} — ${money(it.price * it.qty)} บาท</div>`)
          .join("")}
        <hr />
        <b>รวม: ${money(o.total)} บาท</b>
      </div>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>บิล #${o.id}</title></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  /** ---------- UI ---------- */
  const quickSetRange = (key: "today" | "7d" | "month" | "all") => {
    const now = new Date();
    if (key === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    if (key === "today") {
      const s = new Date().toISOString().slice(0, 10);
      setStartDate(s);
      setEndDate(s);
    } else if (key === "7d") {
      const d = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const first = `${y}-${m}-01`;
      setStartDate(first);
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <main className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">บิลออเดอร์ทั้งหมด</h1>

        {/* Pagination (ซ้ำด้านล่างก็มี) */}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-sm text-slate-600">รวม {total.toLocaleString("th-TH")} รายการ</div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage(1)}>«</Button>
            <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Button>
            <div className="px-2 text-sm">หน้า {page}/{pages}</div>
            <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage((p) => Math.min(pages, p + 1))}>›</Button>
            <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage(pages)}>»</Button>
          </div>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/หน้า</option>)}
          </select>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <div className="relative">
            <Input placeholder="ค้นหา (#บิล / โต๊ะ / ลูกค้า / รายการ)" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-72 pr-9" />
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
          </div>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-xs">
          {(["PENDING", "CONFIRMED", "CANCELED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setShowStatus((p) => ({ ...p, [s]: !p[s] }))}
              className={cn(
                "rounded-full border px-2.5 py-1",
                showStatus[s] ? ORDER_BADGE[s] : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
              title={`สถานะบิล: ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-xs">
          {(["PENDING", "SUBMITTED", "PAID", "EXPIRED", "CANCELED"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setShowPay((s) => ({ ...s, [p]: !s[p] }))}
              className={cn(
                "rounded-full border px-2.5 py-1",
                showPay[p] ? PAY_BADGE[p] : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
              title={`สถานะจ่าย: ${p}`}
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      {/* Date range + Quick set */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-2 py-2">
        <div className="relative">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 pr-9" />
          <IconCalendar className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
        </div>
        <span className="text-slate-500 text-sm">ถึง</span>
        <div className="relative">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 pr-9" />
          <IconCalendar className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={() => fetchOrders()}>
          <RefreshCw className="mr-2 h-4 w-4" /> รีเฟรช
        </Button>
        <div className="flex gap-1 ml-1">
<Button size="sm" variant="secondary" onClick={() => quickSetRange("all")}>ทั้งหมด</Button>
<Button size="sm" variant="info" onClick={() => quickSetRange("today")}>วันนี้</Button>
<Button size="sm" variant="warning" onClick={() => quickSetRange("7d")}>7 วัน</Button>
<Button size="sm" variant="default" onClick={() => quickSetRange("month")}>เดือนนี้</Button>
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-x-auto shadow-sm">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr className="text-left">
              <th className="px-3 py-2 w-24">บิล</th>
              <th className="px-3 py-2 w-36">เวลา</th>
              <th className="px-3 py-2 w-36">โต๊ะ</th>
              <th className="px-3 py-2 w-48">ลูกค้า</th>
              <th className="px-3 py-2">รายการ</th>
              <th className="px-3 py-2 text-right w-32">รวม (บาท)</th>
              <th className="px-3 py-2 w-32">สถานะบิล</th>
              <th className="px-3 py-2 w-32">สถานะจ่าย</th>
              <th className="px-3 py-2 w-64">การทำงาน</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-3" colSpan={9}>
                    <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr className="border-t">
                <td className="px-3 py-6 text-center text-slate-500" colSpan={9}>
                  ไม่พบบิลตามเงื่อนไข
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const itemsPreview = (o.items || []).slice(0, 2).map((it) => `${it.name} ×${it.qty}`).join(", ");
                const more = (o.items?.length || 0) > 2 ? ` +${o.items.length - 2}` : "";
                const pay = o.paymentId ? paymentsMap.get(o.paymentId) : null;
                return (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2 font-medium">#{o.id}</td>
                    <td className="px-3 py-2">{fmtDT(o.createdAt || o.start)}</td>
                    <td className="px-3 py-2">{o.tableLabel || "-"}</td>
                    <td className="px-3 py-2">{userFullName(o.user)}</td>
                    <td className="px-3 py-2">{itemsPreview}{more}</td>
                    <td className="px-3 py-2 text-right">{money(o.total)}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", ORDER_BADGE[o.status])}>{o.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      {pay ? (
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs", PAY_BADGE[pay.status])}>{pay.status}</span>
                      ) : (
                        <span className="rounded-full border px-2 py-0.5 text-xs bg-slate-100 text-slate-600 border-slate-200">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
<Button size="sm" variant="outline" onClick={() => openDetail(o)}>
  <Receipt className="mr-2 h-4 w-4" /> ดู/แก้ไข
</Button>
<Button size="sm" variant="outline" onClick={() => printOrder(o)}>
  <Printer className="mr-2 h-4 w-4" /> พิมพ์
</Button>
<Button
  size="sm"
  variant="outline"
  onClick={() => downloadOrderPdf(o, o.paymentId ? paymentsMap.get(o.paymentId) ?? null : null)}
>
  <FileDown className="mr-2 h-4 w-4" /> PDF
</Button>

{o.status !== "CONFIRMED" && (
  <Button size="sm" variant="success" onClick={() => changeOrderStatus(o, "CONFIRMED")}>
    <CheckCircle2 className="mr-2 h-4 w-4" /> ยืนยัน
  </Button>
)}
{o.status !== "PENDING" && (
  <Button size="sm" variant="outline" onClick={() => changeOrderStatus(o, "PENDING")}>
    <Pencil className="mr-2 h-4 w-4" /> รอชำระ
  </Button>
)}
{o.status !== "CANCELED" && (
  <Button size="sm" variant="destructive" onClick={() => changeOrderStatus(o, "CANCELED")}>
    <XCircle className="mr-2 h-4 w-4" /> ยกเลิก
  </Button>
)}
{canConfirmPay(pay) && (
  <Button size="sm" variant="success" onClick={() => confirmPayment(pay!.id)}>
    <CircleDollarSign className="mr-2 h-4 w-4" /> {confirmLabel(pay!)}
  </Button>
)}

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Pagination footer */}
      <div className="flex items-center justify-end gap-2">
        <div className="text-sm text-slate-600">รวม {total.toLocaleString("th-TH")} รายการ</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage(1)}>«</Button>
          <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Button>
          <div className="px-2 text-sm">หน้า {page}/{pages}</div>
          <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage((p) => Math.min(pages, p + 1))}>›</Button>
          <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage(pages)}>»</Button>
        </div>
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        >
          {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/หน้า</option>)}
        </select>
      </div>

      {/* Detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl bg-white p-0 overflow-hidden rounded-2xl border">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base font-semibold">รายละเอียดบิล</DialogTitle>
          </DialogHeader>

          {!active ? (
            <div className="px-4 pb-6 text-sm text-slate-500">เลือกบิลเพื่อดูรายละเอียด</div>
          ) : (
            <div className="px-4 pb-6 space-y-3">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm">
                  <div className="text-slate-500">บิล</div>
                  <div className="font-medium">#{active.id}</div>
                </div>
                <div className="text-sm">
                  <div className="text-slate-500">เวลา</div>
                  <div className="font-medium">{fmtDT(active.createdAt || active.start)}</div>
                </div>
                <div className="text-sm">
                  <div className="text-slate-500">โต๊ะ</div>
                  <div className="font-medium">{active.tableLabel || "-"}</div>
                </div>
                <div className="text-sm">
                  <div className="text-slate-500">ลูกค้า</div>
                  <div className="font-medium">{userFullName(active.user) || `User #${active.userId}`}</div>
                </div>
                <div className="ml-auto text-sm">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs", ORDER_BADGE[active.status])}>{active.status}</span>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                  <div className="text-sm font-medium">รายละเอียดรายการอาหาร</div>
{/* แถบแก้ไขรายการ */}
{!editMode ? (
  <Button size="sm" variant="outline" onClick={() => { setEditItems(active.items || []); setEditMode(true); }}>
    <Pencil className="mr-2 h-4 w-4" /> แก้ไข
  </Button>
) : (
  <div className="flex gap-2">
    <Button size="sm" variant="success" onClick={saveEditedOrder}>
      <Save className="mr-2 h-4 w-4" /> บันทึก
    </Button>
    <Button size="sm" variant="outline" onClick={() => { setEditItems(active.items || []); setEditMode(false); }}>
      ยกเลิก
    </Button>
  </div>
)}

                </div>

                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">รายการ</th>
                      <th className="px-3 py-2 text-right w-28">ต่อหน่วย</th>
                      <th className="px-3 py-2 text-center w-28">จำนวน</th>
                      <th className="px-3 py-2 text-right w-28">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editMode ? editItems : active.items).map((it, idx) => (
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
                              <button
                                className="h-7 w-7 rounded border bg-slate-50"
                                onClick={() => setEditItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}
                              >-</button>
                              <Input
                                type="number"
                                value={it.qty}
                                onChange={(e) => setEditItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: Math.max(1, Number(e.target.value || 1)) } : x))}
                                className="h-7 w-16 text-center"
                              />
                              <button
                                className="h-7 w-7 rounded border bg-slate-50"
                                onClick={() => setEditItems((prev) => prev.map((x) => x.id === it.id ? { ...x, qty: x.qty + 1 } : x))}
                              >+</button>
                            </div>
                          ) : it.qty}
                        </td>
                        <td className="px-3 py-2 text-right">{money(it.price * it.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="px-3 py-2 text-right text-sm bg-slate-50">
                  รวมทั้งสิ้น <b>{money((editMode ? editItems : active.items).reduce((a, c) => a + c.price * c.qty, 0))} บาท</b>
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">การชำระเงิน</div>
                  <div>
                    {activePay ? (
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", PAY_BADGE[activePay.status])}>{activePay.status}</span>
                    ) : (
                      <span className="text-xs text-slate-500">— ไม่มีข้อมูล —</span>
                    )}
                  </div>
                </div>

                {detailLoading ? (
                  <div className="text-sm text-slate-500 mt-2">กำลังโหลด…</div>
                ) : !activePay ? null : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-sm">
                      <div className="rounded-md border p-3">
                        <div className="text-slate-500">ยอด</div>
                        <div className="font-medium">{money(activePay.amount)} บาท</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-slate-500">หมดอายุ QR</div>
                        <div className="font-medium">{activePay.expiresAt ? fmtDT(activePay.expiresAt) : "-"}</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-slate-500">ยืนยันเมื่อ</div>
                        <div className="font-medium">{activePay.confirmedAt ? fmtDT(activePay.confirmedAt) : "-"}</div>
                      </div>
                    </div>

{activePay.slipImage ? (
  <div className="mt-3 rounded-md border p-3">
    <div className="text-sm font-medium mb-2">สลิปที่อัปโหลด</div>
    <a
      href={imgUrl(activePay.slipImage)}
      target="_blank"
      rel="noreferrer"
      className="inline-block"
      title="คลิกเพื่อดูขนาดเต็ม"
    >
      <Image
        src={imgUrl(activePay.slipImage)}
        alt="slip"
        width={50}
        height={50}
        sizes="100px"
        className="rounded-md border object-contain cursor-zoom-in hover:opacity-90 transition"
      />
    </a>
    <div className="text-xs text-slate-500 mt-2">คลิกภาพเพื่อดูขนาดเต็ม</div>
  </div>
) : null}


                    <div className="mt-3 flex gap-2">
<Button
  size="sm"
  className="bg-emerald-600 hover:bg-emerald-700"
  onClick={() => confirmPayment(activePay.id)}
  disabled={!canConfirmPay(activePay)}
>
  <CircleDollarSign className="mr-2 h-4 w-4" /> {confirmLabel(activePay)}
</Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cancelPayment(activePay?.id)}
                        disabled={!activePay || activePay.status === "CANCELED"}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> ยกเลิกการจ่าย
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex gap-2 justify-end">
                {active.status !== "CONFIRMED" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => changeOrderStatus(active, "CONFIRMED")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> ยืนยันบิล
                  </Button>
                )}
                {active.status !== "CANCELED" && (
                  <Button size="sm" variant="destructive" onClick={() => changeOrderStatus(active, "CANCELED")}>
                    <XCircle className="mr-2 h-4 w-4" /> ยกเลิกบิล
                  </Button>
                )}
                {active.status !== "PENDING" && (
                  <Button size="sm" variant="outline" onClick={() => changeOrderStatus(active, "PENDING")}>
                    <Pencil className="mr-2 h-4 w-4" /> รอชำระ
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => printOrder(active)}>
                  <Printer className="mr-2 h-4 w-4" /> พิมพ์บิล
                </Button>
                <Button
  size="sm"
  variant="outline"
  onClick={() => active && downloadOrderPdf(active, activePay)}
>
  <FileDown className="mr-2 h-4 w-4" /> PDF
</Button>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
