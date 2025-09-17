// app/backoffice/sidebar.tsx
"use client";

import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type Item = { href: string; label: string; icon: string };

const NAV_ITEMS: Item[] = [
  { href: "/backoffice/dashboard", label: "แดชบอร์ด", icon: "fa-solid fa-chart-line" },
  { href: "/backoffice/time",      label: "ตารางเวลาการจอง", icon: "fa-solid fa-clock" },
  { href: "/backoffice/order",     label: "บิล", icon: "fa-solid fa-receipt" },
  { href: "/backoffice/user",      label: "จัดการผู้ใช้", icon: "fa-solid fa-user" },
  { href: "/backoffice/table",     label: "จัดการโต๊ะ", icon: "fa-solid fa-table" },
  { href: "/backoffice/foodtype",  label: "จัดการประเภทอาหาร", icon: "fa-solid fa-list" },
  { href: "/backoffice/menu",      label: "จัดการอาหาร", icon: "fa-solid fa-utensils" },
  { href: "/backoffice/slide",     label: "จัดการภาพสไลด์", icon: "fa-solid fa-images" },
  { href: "/backoffice/about",     label: "เกี่ยวกับเรา", icon: "fa-solid fa-info" },
];

export default function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบใช่หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        localStorage.removeItem("tempToken");
        router.replace("/");
      }
    });
  };

  const isActive = useMemo(
    () => (href: string) => (pathname || "").startsWith(href),
    [pathname]
  );

  return (
    <aside
      role="navigation"
      aria-label="Backoffice sidebar"
      className={cx(
        "bg-blue-900 text-white z-20",

        // --- Mobile: drawer ซ้าย สูงเท่า viewport ---
        "fixed top-0 left-0 h-screen transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",

        // --- Desktop: ติดใต้ header (สูงอย่างน้อยเท่า viewport - header) และอยู่กับที่ตอนสกอลล์ ---
        "md:translate-x-0 md:sticky md:top-16 md:self-start md:h-auto md:min-h-[calc(100vh-4rem)]",

        // กว้างตอนย่อ/ปกติ
        isCollapsed ? "md:w-20" : "md:w-56"
      )}
    >
      {/* mobile ต้องดันเนื้อหาให้พ้น header (h-16) / desktop ไม่ต้อง */}
      <div className="h-full md:h-auto pt-16 md:pt-0 flex flex-col">
        {/* header ภายใน sidebar */}
        <div
          className={cx(
            "border-b border-white/10 px-3 py-3 flex items-center",
            isCollapsed ? "md:justify-center" : ""
          )}
        >
          {/* ปิดได้เฉพาะบนมือถือ */}
          <button
            onClick={onClose}
            className="md:hidden text-white text-3xl leading-none mr-2"
            aria-label="ปิดเมนู"
          >
            &times;
          </button>

          <div className={cx("font-semibold tracking-wide truncate", isCollapsed ? "text-center w-full" : "ml-1")}>
            {isCollapsed ? "SL" : "Sailom Backoffice"}
          </div>
        </div>

        {/* เมนู (สกอลล์เฉพาะซ้ายได้) */}
        <ul className="px-2 py-4 space-y-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map((it) => {
            const active = isActive(it.href);
            return (
              <li key={it.href} className="group relative">
                <Link
                  href={it.href}
                  onClick={onClose}
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                    active ? "bg-white text-blue-900" : "hover:bg-white/10 text-white",
                    isCollapsed ? "justify-center" : ""
                  )}
                >
                  <i className={cx(it.icon, "text-lg w-5 shrink-0 text-current")} />
                  {!isCollapsed && <span className="text-sm truncate">{it.label}</span>}
                </Link>

                {/* tooltip ตอนย่อ (desktop เท่านั้น) */}
                {isCollapsed && (
                  <span
                    className={cx(
                      "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3",
                      "hidden md:block opacity-0 group-hover:opacity-100",
                      "bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg"
                    )}
                  >
                    {it.label}
                  </span>
                )}
              </li>
            );
          })}

          {/* ออกจากระบบ */}
          <li className="mt-2 group relative">
            <button
              onClick={handleLogout}
              className={cx(
                "w-full flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                "text-red-300 hover:bg-white/10 hover:text-red-200",
                isCollapsed ? "justify-center" : ""
              )}
            >
              <i className="fa-solid fa-right-from-bracket text-lg w-5 shrink-0" />
              {!isCollapsed && <span className="text-sm">ออกจากระบบ</span>}
            </button>

            {isCollapsed && (
              <span
                className={cx(
                  "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3",
                  "hidden md:block opacity-0 group-hover:opacity-100",
                  "bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg"
                )}
              >
                ออกจากระบบ
              </span>
            )}
          </li>
        </ul>

        {/* footer */}
        <div className="px-3 py-2 border-t border-white/10 text-[11px] text-white/70">
          {isCollapsed ? "v1.0" : "© Sailom • v1.0"}
        </div>
      </div>
    </aside>
  );
}
