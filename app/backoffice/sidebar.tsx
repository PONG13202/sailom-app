"use client";

import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  { href: "/backoffice/time", label: "ตารางเวลาการจอง", icon: "fa-solid fa-clock" },
  { href: "/backoffice/order", label: "บิล", icon: "fa-solid fa-receipt" },
  { href: "/backoffice/user", label: "จัดการผู้ใช้", icon: "fa-solid fa-user" },
  { href: "/backoffice/table", label: "จัดการโต๊ะ", icon: "fa-solid fa-table" },
  { href: "/backoffice/foodtype", label: "จัดการประเภทอาหาร", icon: "fa-solid fa-list" },
  { href: "/backoffice/menu", label: "จัดการอาหาร", icon: "fa-solid fa-utensils" },
  { href: "/backoffice/slide", label: "จัดการภาพสไลด์", icon: "fa-solid fa-images" },
  { href: "/backoffice/about", label: "เกี่ยวกับเรา", icon: "fa-solid fa-info" },
];

export default function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState({ isAdmin: false, isStaff: false });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole({
          isAdmin: !!payload.isAdmin,
          isStaff: !!payload.isStaff,
        });
      } catch {
        setRole({ isAdmin: false, isStaff: false });
      }
    }
  }, []);

  // ✅ กรองเมนูตาม role
  const filteredItems = useMemo(() => {
    if (role.isAdmin) return NAV_ITEMS;
    if (role.isStaff) {
      return NAV_ITEMS.filter(
        (it) =>
          !(
            it.href.startsWith("/backoffice/user") ||
            it.href.startsWith("/backoffice/slide") ||
            it.href.startsWith("/backoffice/about")
          )
      );
    }
    return [];
  }, [role]);

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
        "fixed top-0 left-0 h-screen transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0 md:fixed md:top-16 md:left-0 md:h-[calc(100vh-4rem)]",
        isCollapsed ? "md:w-20" : "md:w-56",
      )}
    >
      <div className="h-full md:h-auto pt-16 md:pt-0 flex flex-col">
        {/* Header */}
        <div
          className={cx(
            "border-b border-white/10 px-3 py-3 flex items-center",
            isCollapsed ? "md:justify-center" : ""
          )}
        >
          <button
            onClick={onClose}
            className="md:hidden text-white text-3xl leading-none mr-2"
            aria-label="ปิดเมนู"
          >
            &times;
          </button>
          <div
            className={cx(
              "font-semibold tracking-wide truncate",
              isCollapsed ? "text-center w-full" : "ml-1"
            )}
          >
            {isCollapsed ? "SL" : "Sailom Backoffice"}
          </div>
        </div>

        {/* เมนู */}
        <ul className="px-2 py-4 space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {filteredItems.map((it) => {
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
              </li>
            );
          })}

          {/* Logout */}
          <li className="mt-2 group relative">
            <button
              onClick={handleLogout}
              className={cx(
                "cursor-pointer w-full flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                "text-red-500 hover:bg-white/10 hover:text-red-400",
                isCollapsed ? "justify-center" : ""
              )}
            >
              <i className="fa-solid fa-right-from-bracket text-lg w-5 shrink-0" />
              {!isCollapsed && <span className="text-sm">ออกจากระบบ</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
