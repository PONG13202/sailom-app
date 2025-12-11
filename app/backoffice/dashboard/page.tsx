"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "@/app/config";
import { socket } from "@/app/socket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  RefreshCw,
  BarChart2,
  ClipboardList,
  Award,
  Calendar as IconCalendar,
} from "lucide-react";

// --- Charts (recharts) ---
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* ==================== Types ==================== */
type OrderItem = {
  id: number;
  menuId: number;
  name: string;
  price: number;
  qty: number;
  note?: string | null;
};

type OrderRow = {
  id: number;
  userId: number;
  total: number;
  status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "CANCELED";
  // เผื่อ BE บางที่ยังส่งมาด้วย (ไม่พึ่งฟิลด์นี้แล้ว)
  reservationStatus?:
    | "PENDING_OTP"
    | "OTP_VERIFIED"
    | "AWAITING_PAYMENT"
    | "CONFIRMED"
    | "EXPIRED"
    | "CANCELED"
    | null;
  items: OrderItem[];
  createdAt?: string | null;
  start?: string | null; // เวลาจองเริ่ม (ถ้ามี join)
  tableLabel?: string | null;
  paymentId?: number | null;
  user?: { id: number; name: string | null };
};

type ReservationRow = {
  id: number;
  tableId: number;
  tableLabel?: string | null;
  start: string;
  end?: string | null;
  people: number;
  status:
    | "PENDING_OTP"
    | "OTP_VERIFIED"
    | "AWAITING_PAYMENT"
    | "CONFIRMED"
    | "EXPIRED"
    | "CANCELED";
  depositAmount?: number | null;
  orderId?: number | null;
  paymentId?: number | null;
  paymentExpire?: string | null;
  user?: { id: number; name: string; phone?: string | null };
};

/* ==================== Helpers ==================== */
const money = (n?: number | null) => Number(n || 0).toLocaleString("th-TH");

const authHeader = () => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// สร้าง list วันที่ให้ครบช่วง (สำหรับกราฟ/loop fetch reservation รายวัน)
function buildDateRange(startISO: string, endISO: string) {
  const out: string[] = [];
  const s = new Date(startISO);
  const e = new Date(endISO);
  for (let d = new Date(s); d <= e; d = addDays(d, 1)) out.push(dateStr(d));
  return out;
}

/* ==================== Page ==================== */
export default function Dashboard() {
  const router = useRouter();

  // ---------- auth guard ----------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "หมดเวลาการใช้งาน",
        text: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        showConfirmButton: false,
        timer: 2000,
      });
      localStorage.removeItem("token");
      localStorage.removeItem("tempToken");
      router.replace("/");
    }
  }, [router]);

  // ---------- range ----------
  const today = dateStr(new Date());
  const [startDate, setStartDate] = useState<string>(
    dateStr(addDays(new Date(), -6))
  ); // default 7 วันล่าสุด
  const [endDate, setEndDate] = useState<string>(today);

  // ---------- data ----------
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  // ---------- fetch orders ----------
  const fetchOrders = useCallback(async () => {
const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};

    const { data } = await axios.get(`${config.apiUrl}/orders`, {
      params: { start: startDate, end: endDate, page: 1, pageSize: 2000 },
      headers,
    });
    const arr = (data?.data ?? data ?? []) as OrderRow[];
    setOrders((arr || []).map((o) => ({ ...o, items: o.items ?? [] })));
  }, [startDate, endDate]);

  // ---------- fetch reservations (loop รายวัน) ----------
  const fetchReservationsRange = useCallback(async () => {
const headers: Record<string, string | undefined> = {
  "Cache-Control": "no-store",
  ...authHeader(),
};

    const days = buildDateRange(startDate, endDate);
    const responses = await Promise.all(
      days.map((d) =>
        axios
          .get(`${config.apiUrl}/reservation`, {
            params: { date: d },
            headers,
          })
          .catch(() => ({ data: { data: [] } }))
      )
    );
    const allRows: any[] = responses.flatMap((r) => r?.data?.data || []);
    const mapped: ReservationRow[] = allRows.map((r: any) => ({
      id: r.id,
      tableId: r.tableId,
      tableLabel: r.tableLabel ?? null,
      start:
        typeof r.start === "string"
          ? r.start
          : r.start
          ? new Date(r.start).toISOString()
          : "",
      end:
        typeof r.end === "string"
          ? r.end
          : r.end
          ? new Date(r.end).toISOString()
          : null,
      people: Number(r.people || 0),
      status: r.status,
      depositAmount: r.depositAmount ?? null,
      orderId: r.orderId ?? null,
      paymentId: r.paymentId ?? null,
      paymentExpire:
        r.paymentExpire || r.paymentExpiresAt || r.paymentExpires || null,
      user: r.user
        ? { id: r.user.id, name: r.user.name, phone: r.user.phone ?? null }
        : undefined,
    }));
    setReservations(mapped);
  }, [startDate, endDate]);

  // ---------- fetch both ----------
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchReservationsRange()]);
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: "หมดเวลาการใช้งาน",
          text: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
          timer: 1800,
          showConfirmButton: false,
        });
        localStorage.removeItem("token");
        localStorage.removeItem("tempToken");
        router.replace("/");
      } else {
        Swal.fire({ icon: "error", title: "โหลดข้อมูลไม่สำเร็จ" });
      }
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, fetchReservationsRange, router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // realtime auto refresh (orders + reservations)
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const refresh = () => fetchAll();

    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("payment:succeeded", refresh);
    socket.on("payment:updated", refresh);

    socket.on("reservation:created", refresh);
    socket.on("reservation:updated", refresh);
    socket.on("reservation:confirmed", refresh);
    socket.on("reservation:canceled", refresh);

    return () => {
      socket.off("order:created", refresh);
      socket.off("order:updated", refresh);
      socket.off("payment:succeeded", refresh);
      socket.off("payment:updated", refresh);

      socket.off("reservation:created", refresh);
      socket.off("reservation:updated", refresh);
      socket.off("reservation:confirmed", refresh);
      socket.off("reservation:canceled", refresh);
    };
  }, [fetchAll]);

  // ---------- derived stats ----------
  const pendingCount = useMemo(() => {
    const orderPending = orders.filter(
      (o) => o.status === "PENDING" || o.status === "SUBMITTED"
    ).length;

    const reservationPending = reservations.filter(
      (r) => r.status === "AWAITING_PAYMENT"
    ).length;

    return orderPending + reservationPending;
  }, [orders, reservations]);

  const confirmedOrders = useMemo(
    () => orders.filter((o) => o.status === "CONFIRMED"),
    [orders]
  );
  const confirmedTotal = useMemo(
    () => confirmedOrders.reduce((a, c) => a + Number(c.total || 0), 0),
    [confirmedOrders]
  );

  // daily revenue (จากบิลที่ยืนยันแล้ว)
  const revenueSeries = useMemo(() => {
    const keys = buildDateRange(startDate, endDate);
    const map = new Map(keys.map((k) => [k, 0]));
    for (const o of confirmedOrders) {
      const key = dateStr(new Date(o.start || o.createdAt || endDate));
      map.set(key, (map.get(key) || 0) + Number(o.total || 0));
    }
    return keys.map((k) => ({
      date: new Date(k).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
      }),
      key: k,
      revenue: map.get(k) || 0,
    }));
  }, [confirmedOrders, startDate, endDate]);

  // top menus (จากบิลที่ยืนยันแล้ว)
  const topMenus = useMemo(() => {
    const qtyByName = new Map<string, number>();
    const amtByName = new Map<string, number>();
    for (const o of confirmedOrders) {
      for (const it of o.items || []) {
        qtyByName.set(
          it.name,
          (qtyByName.get(it.name) || 0) + (Number(it.qty) || 0)
        );
        amtByName.set(
          it.name,
          (amtByName.get(it.name) || 0) +
            Number(it.price || 0) * Number(it.qty || 0)
        );
      }
    }
    const rows = Array.from(qtyByName.entries())
      .map(([name, qty]) => ({ name, qty, amount: amtByName.get(name) || 0 }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
    return rows;
  }, [confirmedOrders]);

  // quick ranges
  const quickSet = (key: "today" | "7d" | "30d" | "month") => {
    const now = new Date();
    if (key === "today") {
      const d = dateStr(now);
      setStartDate(d);
      setEndDate(d);
    } else if (key === "7d") {
      setStartDate(dateStr(addDays(now, -6)));
      setEndDate(dateStr(now));
    } else if (key === "30d") {
      setStartDate(dateStr(addDays(now, -29)));
      setEndDate(dateStr(now));
    } else {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      setStartDate(`${y}-${m}-01`);
      setEndDate(dateStr(now));
    }
  };

  return (
    <div className="h-full p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          Dashboard
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2 rounded-xl border bg-white px-2 py-1">
          <div className="relative">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 pr-9"
            />
            <IconCalendar className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
          </div>
          <span className="text-slate-500 text-sm">ถึง</span>
          <div className="relative">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 pr-9"
            />
            <IconCalendar className="absolute right-2 top-2.5 h-4 w-4 text-slate-500" />
          </div>
          <div className="flex gap-1 ml-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => quickSet("today")}
            >
              วันนี้
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => quickSet("7d")}
            >
              7 วัน
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => quickSet("30d")}
            >
              30 วัน
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => quickSet("month")}
            >
              เดือนนี้
            </Button>
          </div>
          <Button size="sm" variant="outline" className="h-9" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">ออเดอร์/จอง รอยืนยัน</div>
            <div className="text-xl font-semibold">{pendingCount}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">
              รายได้ช่วงที่เลือก* (บิลยืนยันแล้ว)
            </div>
            <div className="text-xl font-semibold">
              {money(confirmedTotal)} บาท
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">
              จำนวนบิลที่ยืนยันแล้ว
            </div>
            <div className="text-xl font-semibold">{confirmedOrders.length}</div>
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="p-4">
        <div className="mb-2 font-semibold text-sm">
          กราฟรายได้ต่อวัน (บิลยืนยันแล้ว)
        </div>
        <div className="h-72">
          {loading ? (
            <div className="h-full rounded bg-slate-100 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`${money(val as number)} บาท`, "รายได้"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="รายได้"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          *คำนวณจากยอดรวมของบิลสถานะ CONFIRMED
        </div>
      </Card>

      {/* Best sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-violet-600" />
            <div className="font-semibold text-sm">เมนูขายดี (ตามจำนวนที่ขาย)</div>
          </div>

          {loading ? (
            <div className="grid gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : topMenus.length === 0 ? (
            <div className="text-sm text-slate-500 p-4">
              ยังไม่มียอดขายในช่วงนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-12">#</th>
                    <th className="px-3 py-2">เมนู</th>
                    <th className="px-3 py-2 text-right w-28">จำนวน</th>
                    <th className="px-3 py-2 text-right w-32">ยอดขาย (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {topMenus.map((r, idx) => (
                    <tr key={r.name} className="border-t">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-right">{r.qty}</td>
                      <td className="px-3 py-2 text-right">{money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
            <div className="font-semibold text-sm">ยอดขายตามเมนู (Bar)</div>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full rounded bg-slate-100 animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMenus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(val: any, key: any) =>
                      key === "qty"
                        ? [`${val} ที่`, "จำนวน"]
                        : [`${money(val as number)} บาท`, "ยอดขาย"]
                    }
                  />
                  <Legend />
                  <Bar dataKey="qty" name="จำนวน" />
                  <Bar dataKey="amount" name="ยอดขาย (บาท)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
