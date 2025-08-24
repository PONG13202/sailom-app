// app/components/pages/About.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { ExternalLink, MapPin, Plus, Save, Trash2, Edit2, X } from "lucide-react";
import { config } from "../../config";

/** ---------- Types ---------- */
type LocationT = {
  location_id: number;
  location_name: string;
  location_link: string;
  location_map: string;
};

type ContactT = {
  contact_id: number;
  contact_name: string;
  contact_link?: string | null;
};

/** ---------- Helpers ---------- */
const extractMapSrc = (raw: string) => {
  if (!raw) return "";
  const s = String(raw).trim();

  const iframeSrc = s.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i);
  if (iframeSrc?.[1]) return iframeSrc[1];

  const directEmbed = s.match(/https?:\/\/www\.google\.com\/maps\/embed\?[^"' <]+/i);
  if (directEmbed?.[0]) return directEmbed[0];

  const anyUrl = s.match(/https?:\/\/[^\s<>"']+/i);
  if (anyUrl?.[0]) {
    const url = anyUrl[0];
    if (/\/maps\/embed/i.test(url)) return url;
    return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }

  const coord = s.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (coord) {
    return `https://www.google.com/maps?q=${coord[1]},${coord[2]}&output=embed`;
  }
  return "";
};

// ---- Contact value render helpers ----
const normalizeUrl = (v: string) => {
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  return v;
};
const isUrl = (v: string) => {
  try {
    // allow www.* by normalizing first
    new URL(normalizeUrl(v));
    return true;
  } catch {
    return false;
  }
};
const isPhone = (v: string) => /^[+]?[\d\s().-]{5,}$/.test(v.trim());
const toTelHref = (v: string) => {
  let s = v.trim();
  // keep a leading + then remove non-digits
  if (s.startsWith("+")) {
    return `tel:+${s.slice(1).replace(/\D/g, "")}`;
  }
  return `tel:${s.replace(/\D/g, "")}`;
};
const isLineish = (name: string, v: string) =>
  /line/i.test(name) || /^@/.test(v.trim()) || /^line(?:id)?:/i.test(v.trim());
const makeLineUrl = (v: string) => {
  let id = v.trim();
  id = id.replace(/^line(?:id)?:/i, "").trim();
  if (id.startsWith("@")) id = id.slice(1);
  return `https://line.me/R/ti/p/~${encodeURIComponent(id)}`;
};

export default function About() {
  const router = useRouter();

  /** ---------- State ---------- */
  const [loc, setLoc] = useState<LocationT | null>(null);
  const [locForm, setLocForm] = useState<LocationT | null>(null);

  const [contacts, setContacts] = useState<ContactT[]>([]);
  const [adding, setAdding] = useState(false);
  const [newContact, setNewContact] = useState<Omit<ContactT, "contact_id">>({
    contact_name: "",
    contact_link: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<ContactT, "contact_id">>({
    contact_name: "",
    contact_link: "",
  });

  /** ---------- Map src ---------- */
  const mapSrc = useMemo(
    () => extractMapSrc(locForm?.location_map || ""),
    [locForm?.location_map]
  );

  /** ---------- Auth & Load ---------- */
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
      return;
    }

    const load = async () => {
      try {
        const [locRes, cRes] = await Promise.all([
          axios.get<LocationT>(`${config.apiUrl}/location`),
          axios.get<ContactT[]>(`${config.apiUrl}/contacts`),
        ]);
        setLoc(locRes.data || null);
        setLocForm(locRes.data || null);
        setContacts(Array.isArray(cRes.data) ? cRes.data : []);
      } catch (e: any) {
        Swal.fire({
          icon: "error",
          title: "โหลดข้อมูลไม่ได้",
          text: e?.response?.data?.message || String(e),
          showConfirmButton: false,
          timer: 1800,
        });
      }
    };
    load();
  }, [router]);

  /** ---------- Actions ---------- */
  // Location: อัปเดต
  const saveLocation = async () => {
    if (!locForm || !locForm.location_name?.trim()) {
      return Swal.fire({ icon: "warning", title: "กรอกชื่อสถานที่ด้วย", showConfirmButton: false, timer: 1500 });
    }
    try {
      const payload: LocationT = {
        ...locForm,
        location_map: extractMapSrc(locForm.location_map || ""),
      };
      const res = await axios.put<LocationT>(
        `${config.apiUrl}/update_location/${locForm.location_id}`,
        payload
      );
      setLoc(res.data);
      setLocForm(res.data);
      Swal.fire({
        icon: "success",
        title: "บันทึกสถานที่แล้ว",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: e?.response?.data?.message || String(e),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  // Contacts — สร้าง/แก้ไข/ลบ (2 ฟิลด์)
  const startAdd = () => {
    setAdding(true);
    setNewContact({ contact_name: "", contact_link: "" });
  };
  const cancelAdd = () => setAdding(false);

  const createContact = async () => {
    if (!newContact.contact_name.trim()) {
      return Swal.fire({ icon: "warning", title: "กรอกชื่อช่องทางด้วย" });
    }
    try {
      const { data } = await axios.post<ContactT>(`${config.apiUrl}/add_contact`, {
        contact_name: newContact.contact_name.trim(),
        contact_link: newContact.contact_link?.trim() || null,
      });
      setContacts((prev) => [data, ...prev]);
      setAdding(false);
      Swal.fire({ icon: "success", title: "เพิ่มข้อมูลติดต่อแล้ว", showConfirmButton: false, timer: 1500 });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "เพิ่มไม่สำเร็จ",
        text: e?.response?.data?.message || String(e),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  const startEdit = (c: ContactT) => {
    setEditingId(c.contact_id);
    setEditDraft({
      contact_name: c.contact_name || "",
      contact_link: c.contact_link || "",
    });
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: number) => {
    if (!editDraft.contact_name.trim()) {
      return Swal.fire({ icon: "warning", title: "กรอกชื่อช่องทางด้วยนะ" });
    }
    try {
      const { data } = await axios.put<ContactT>(
        `${config.apiUrl}/update_contact/${id}`,
        {
          contact_name: editDraft.contact_name.trim(),
          contact_link: editDraft.contact_link?.trim() || null,
        }
      );
      setContacts((prev) => prev.map((x) => (x.contact_id === id ? data : x)));
      setEditingId(null);
      Swal.fire({ icon: "success", title: "อัปเดตแล้ว", showConfirmButton: false, timer: 1500 });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "อัปเดตไม่สำเร็จ",
        text: e?.response?.data?.message || String(e),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  const removeContact = async (id: number) => {
    const ok = await Swal.fire({
      icon: "warning",
      title: "ลบรายการนี้?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!ok.isConfirmed) return;
    try {
      await axios.delete(`${config.apiUrl}/delete_contact/${id}`);
      setContacts((prev) => prev.filter((x) => x.contact_id !== id));
      Swal.fire({ icon: "success", title: "ลบแล้ว", showConfirmButton: false, timer: 1500 });
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: e?.response?.data?.message || String(e),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  /** ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">เกี่ยวกับเรา</h1>
          <p className="mt-1 text-slate-600">จัดการข้อมูลการติดต่อและสถานที่ตั้งของร้าน</p>
          <div className="mt-3 h-1 w-20 rounded bg-blue-600" />
        </div>

        {/* Contacts */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">ข้อมูลการติดต่อ</h2>
            {!adding ? (
              <button
                onClick={startAdd}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-white shadow-sm hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Plus className="h-4 w-4" />
                เพิ่มช่องทาง
              </button>
            ) : (
              <button
                onClick={cancelAdd}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-red-600 px-3 py-2 text-white shadow-sm hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-4 w-4" />
                ยกเลิก
              </button>
            )}
          </div>

          {/* Add form */}
          {adding && (
            <div className="mb-6 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  placeholder="ชื่อช่องทาง (เช่น Facebook / Line / เบอร์โทร)"
                  value={newContact.contact_name}
                  onChange={(e) => setNewContact((s) => ({ ...s, contact_name: e.target.value }))}
                />
                <div className="md:col-span-2 flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    placeholder="ลิงก์/เบอร์/ไลน์ไอดี (เช่น https://…, 081-234-5678, @myshop)"
                    value={newContact.contact_link || ""}
                    onChange={(e) => setNewContact((s) => ({ ...s, contact_link: e.target.value }))}
                  />
                  <button
                    onClick={createContact}
                    type="button"
                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Save className="h-4 w-4" />
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
            <table className="min-w-full divide-y">
              <thead className="bg-blue-50">
                <tr className="text-left text-sm text-slate-700">
                  <th className="px-4 py-3">ชื่อช่องทาง</th>
                  <th className="px-4 py-3">ลิงก์ / ข้อมูล</th>
                  <th className="px-4 py-3 w-40">การทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((c) => {
                  const raw = c.contact_link?.trim() || "";
                  const showAsUrl = raw && isUrl(raw);
                  const showAsPhone = raw && isPhone(raw);
                  const showAsLine = raw && isLineish(c.contact_name, raw);

                  const urlHref = showAsUrl ? normalizeUrl(raw) : undefined;
                  const telHref = showAsPhone ? toTelHref(raw) : undefined;
                  const lineHref = showAsLine && !showAsUrl ? makeLineUrl(raw) : undefined;

                  return (
                    <tr key={c.contact_id} className="text-sm">
                      <td className="px-4 py-3">
                        {editingId === c.contact_id ? (
                          <input
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            value={editDraft.contact_name}
                            onChange={(e) => setEditDraft((s) => ({ ...s, contact_name: e.target.value }))}
                          />
                        ) : (
                          <span className="font-medium text-slate-900">{c.contact_name}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editingId === c.contact_id ? (
                          <input
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            value={editDraft.contact_link || ""}
                            onChange={(e) => setEditDraft((s) => ({ ...s, contact_link: e.target.value }))}
                          />
                        ) : raw ? (
                          showAsUrl ? (
                            <a
                              href={urlHref}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              เปิดลิงก์ <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : showAsPhone ? (
                            <a href={telHref} className="text-slate-800 hover:underline">
                              {raw}
                            </a>
                          ) : lineHref ? (
                            <a
                              href={lineHref}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-green-700 hover:underline"
                            >
                              {raw} <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-slate-700">{raw}</span>
                          )
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editingId === c.contact_id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(c.contact_id)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                              <Save className="h-4 w-4" /> บันทึก
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <X className="h-4 w-4" /> ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(c)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <Edit2 className="h-4 w-4" /> แก้ไข
                            </button>
                            <button
                              onClick={() => removeContact(c.contact_id)}
                              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-white shadow-sm hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                              <Trash2 className="h-4 w-4" /> ลบ
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      ยังไม่มีข้อมูลติดต่อ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Location */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-slate-900">สถานที่ตั้ง</h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-5 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อสถานที่</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  placeholder="โรงแรม ..."
                  value={locForm?.location_name || ""}
                  onChange={(e) =>
                    setLocForm((s) => (s ? { ...s, location_name: e.target.value } : s))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">ลิงก์</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  placeholder="https://facebook.com/…"
                  value={locForm?.location_link || ""}
                  onChange={(e) =>
                    setLocForm((s) => (s ? { ...s, location_link: e.target.value } : s))
                  }
                />
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">ลิงก์แผนที่</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  placeholder="วางลิงก์ Google Maps หรือโค้ด <iframe> ก็ได้"
                  value={locForm?.location_map || ""}
                  onChange={(e) =>
                    setLocForm((s) => (s ? { ...s, location_map: e.target.value } : s))
                  }
                  onBlur={() =>
                    setLocForm((s) =>
                      s ? { ...s, location_map: extractMapSrc(s.location_map || "") } : s
                    )
                  }
                />
                <p className="mt-1 text-xs text-slate-500">
                  * ระบบจะดึง <code>src</code> อัตโนมัติแม้คุณจะวางเป็นโค้ด &lt;iframe&gt; ทั้งแท่ง
                </p>
              </div>

              <button
                onClick={saveLocation}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-white shadow-sm hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Save className="h-4 w-4" />
                บันทึกสถานที่
              </button>

              {loc?.location_link && (
                <a
                  href={loc.location_link}
                  target="_blank"
                  className="ml-3 inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:underline"
                >
                  ไปยังเพจ <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Map preview */}
            <div className="lg:col-span-7 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-slate-700">
                <MapPin className="h-5 w-5 text-blue-700" />
                <span className="font-semibold">{locForm?.location_name || "พรีวิวแผนที่"}</span>
              </div>
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-slate-200">
                {mapSrc ? (
                  <iframe
                    src={mapSrc}
                    className="h-full w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-slate-500">
                    วางลิงก์แผนที่เพื่อแสดงพรีวิว
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
