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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
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
  // optional fields from backend joins
  reservationId?: number | null;
  tableLabel?: string | null;
  start?: string | null; // reservation start
  user?: { id: number; name: string; phone?: string | null };
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

/** -------------------- Page -------------------- */
export default function BackofficeOrdersPage() {
  // range filters
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  // client filters
  const [q, setQ] = useState("");
  const [showStatus, setShowStatus] = useState<Record<string, boolean>>({
    PENDING: true,
    CONFIRMED: true,
    CANCELED: false,
  });
  const [showPay, setShowPay] = useState<Record<string, boolean>>({
    PENDING: true,
    SUBMITTED: true,
    PAID: true,
    EXPIRED: false,
    CANCELED: false,
  });

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [paymentsMap, setPaymentsMap] = useState<Map<number, PaymentRow>>(new Map());

  // details dialog
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<OrderRow | null>(null);
  const [activePay, setActivePay] = useState<PaymentRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  /** ---------- fetch list ---------- */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { "Cache-Control": "no-store", ...authHeader() };
      // คาดหวัง API: GET /orders?start=YYYY-MM-DD&end=YYYY-MM-DD
      const { data } = await axios.get(`${config.apiUrl}/orders`, {
        params: { start: startDate, end: endDate },
        headers,
      });
      const arr = (data?.data ?? data ?? []) as OrderRow[];
      setOrders(
        arr
          .map((o) => ({ ...o, items: o.items ?? [] }))
          .sort((a, b) => (+(new Date(b.createdAt || b.start || 0)) - +(new Date(a.createdAt || a.start || 0))))
      );

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
  }, [startDate, endDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /** ---------- realtime ---------- */
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => fetchOrders();
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("payment:succeeded", refresh);
    socket.on("payment:updated", refresh);
    return () => {
      socket.off("order:created", refresh);
      socket.off("order:updated", refresh);
      socket.off("payment:succeeded", refresh);
      socket.off("payment:updated", refresh);
    };
  }, [fetchOrders]);

  /** ---------- list filters ---------- */
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orders.filter((o) => {
      const passStatus = showStatus[o.status] ?? true;
      const p = o.paymentId ? paymentsMap.get(o.paymentId) : null;
      const passPay = !p || (showPay[p.status] ?? true);
      const s = [
        `#${o.id}`,
        o.tableLabel || "",
        o.user?.name || "",
        (o.items || []).map((it) => it.name).join(", "),
      ].join(" ").toLowerCase();
      const passKw = !kw || s.includes(kw);
      return passStatus && passPay && passKw;
    });
  }, [orders, q, showStatus, showPay, paymentsMap]);

  /** ---------- open detail ---------- */
  const openDetail = async (o: OrderRow) => {
    setOpen(true);
    setActive(null);
    setActivePay(null);
    setEditMode(false);
    setEditItems([]);
    setDetailLoading(true);
    try {
      const headers = { "Cache-Control": "no-store", ...authHeader() };
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
      const headers = { "Cache-Control": "no-store", ...authHeader() };
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
      const headers = { "Cache-Control": "no-store", ...authHeader() };
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
      const headers = { "Cache-Control": "no-store", ...authHeader() };
      await axios.post(`${config.apiUrl}/payment/${paymentId}/confirm`, {}, { headers });
      if (active?.id) await openDetail(active);
      await fetchOrders();
      await Swal.fire({ icon: "success", title: "รับชำระแล้ว", timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "ยืนยันชำระไม่สำเร็จ", text: e?.response?.data?.message || "" });
    }
  };

  const printOrder = (o: OrderRow) => {
    const html = `
      <div>
        <h3>บิล #${o.id}</h3>
        <div>เวลา: ${fmtDT(o.createdAt || o.start)}</div>
        <div>ลูกค้า: ${o.user?.name || "-"}</div>
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
  const quickSetRange = (key: "today" | "7d" | "month") => {
    const now = new Date();
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

  return (
    <main className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">บิลออเดอร์ทั้งหมด</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2 rounded-xl border bg-white px-2 py-1">
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
            <Button size="sm" variant="secondary" onClick={() => quickSetRange("today")}>วันนี้</Button>
            <Button size="sm" variant="secondary" onClick={() => quickSetRange("7d")}>7 วัน</Button>
            <Button size="sm" variant="secondary" onClick={() => quickSetRange("month")}>เดือนนี้</Button>
          </div>
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
              <th className="px-3 py-2 w-48">การทำงาน</th>
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
                    <td className="px-3 py-2">{o.user?.name || "-"}</td>
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
                        {o.status !== "CONFIRMED" && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => changeOrderStatus(o, "CONFIRMED")}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> ยืนยัน
                          </Button>
                        )}
                        {o.status !== "CANCELED" && (
                          <Button size="sm" variant="destructive" onClick={() => changeOrderStatus(o, "CANCELED")}>
                            <XCircle className="mr-2 h-4 w-4" /> ยกเลิก
                          </Button>
                        )}
                        {pay && pay.status !== "PAID" && (
                          <Button size="sm" variant="outline" onClick={() => confirmPayment(pay.id)}>
                            <CircleDollarSign className="mr-2 h-4 w-4" /> รับชำระ
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
                  <div className="font-medium">{active.user?.name || `User #${active.userId}`}</div>
                </div>
                <div className="ml-auto text-sm">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs", ORDER_BADGE[active.status])}>{active.status}</span>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-lg border bg-white overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                  <div className="text-sm font-medium">รายละเอียดรายการอาหาร</div>
                  {!editMode ? (
                    <Button size="sm" variant="outline" onClick={() => { setEditItems(active.items || []); setEditMode(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> แก้ไข
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEditedOrder} className="bg-emerald-600 hover:bg-emerald-700">
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
                        <a href={activePay.slipImage} target="_blank" rel="noreferrer" className="block">
                          <Image
                            src={activePay.slipImage}
                            alt="slip"
                            width={700}
                            height={900}
                            className="w-full max-w-sm rounded border h-auto"
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
                        disabled={activePay.status === "PAID"}
                      >
                        <CircleDollarSign className="mr-2 h-4 w-4" /> ยืนยันรับชำระ
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
                <Button size="sm" variant="outline" onClick={() => printOrder(active)}>
                  <Printer className="mr-2 h-4 w-4" /> พิมพ์บิล
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
