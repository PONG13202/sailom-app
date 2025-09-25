"use client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import Sidebar from "../backoffice/sidebar";
import axios from "axios";
import { config } from "../config";
import Swal from "sweetalert2";
import { checkRoleGuard } from "../../lib/roleGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // ✅ ใช้ hook ของ Next.js

  const [user, setUser] = useState<{
    user_fname: string;
    user_lname: string;
    user_img: string | null;
  }>({
    user_fname: "",
    user_lname: "",
    user_img: null,
  });

  /* ================= Clock Component ================= */
  function ClockThai({ className }: { className?: string }) {
    const [mounted, setMounted] = useState(false);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
      if (!mounted) return;
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, [mounted]);

    const formatted = useMemo(() => {
      if (!now) return "—";
      return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
        timeZone: "Asia/Bangkok",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).format(now);
    }, [now]);

    return (
      <span className={className} suppressHydrationWarning>
        {formatted}
      </span>
    );
  }

  /* ================= Auth & Role Guard ================= */
  useEffect(() => {
    const fetchUserAndCheckToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/");
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const currentTime = Date.now() / 1000;
        if (payload.exp < currentTime) throw new Error("Token expired");

        // ✅ เช็ก role guard
        const guard = checkRoleGuard(pathname, payload);
        if (!guard.allowed) {
          Swal.fire({
            icon: "error",
            title: "สิทธิ์ไม่เพียงพอ",
            text: "คุณไม่มีสิทธิ์เข้าหน้านี้",
            showConfirmButton: false,
            timer: 2000,
          });
          router.replace(guard.redirect || "/");
          return;
        }

        // ✅ ผ่านแล้วค่อยไปดึง info
        const res = await axios.get(`${config.apiUrl}/info`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(res.data);
      } catch (err: any) {
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
    };

    fetchUserAndCheckToken();
  }, [router, pathname]);

  /* ================= Sidebar Toggle ================= */
  const handleBurgerClick = () => {
    if (window.innerWidth >= 768) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ================= Render ================= */
  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 top-16 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-20" : "md:ml-56"
        }`}
      >
        <header className="bg-blue-900 text-white h-16 px-4 flex items-center fixed top-0 left-0 right-0 z-30">
          <button
            onClick={handleBurgerClick}
            aria-label="เปิด/ปิดเมนู"
            className="text-2xl mr-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3 text-xs sm:text-sm md:text-base min-w-0">
            <span className="font-medium whitespace-nowrap" suppressHydrationWarning>
              <ClockThai />
            </span>

            <span aria-hidden className="h-5 w-px bg-white/30" />

            <Image
              src={user?.user_img || "/user_default.jpeg"}
              alt="User Avatar"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full border border-white object-cover"
            />

            <span className="whitespace-nowrap truncate">
              ยินดีต้อนรับ{" "}
              <span className="font-bold text-yellow-300">
                {user.user_fname} {user.user_lname}
              </span>
            </span>
          </div>
        </header>

        <main className="flex-1 pt-16 p-4 ">{children}</main>
      </div>
    </div>
  );
}
