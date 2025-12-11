"use client";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { socket } from "@/app/socket";
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
  user_id: number | null;
  user_fname: string;
  user_lname: string;
  user_img: string | null;
  user_name: string | null;
}>({
  user_id: null,
  user_fname: "",
  user_lname: "",
  user_img: null,
  user_name: null,
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
  function normalizeAvatarUrl(pathStr?: string | null) {
  if (!pathStr) return "/user_default.jpeg"; // fallback
  if (pathStr.startsWith("http")) return pathStr;
  return `${config.apiUrl}/${pathStr.replace(/^\//, "")}`;
}


  /* ================= Auth & Role Guard ================= */
useEffect(() => {
  const fetchUserAndCheckToken = async () => {
    const token = localStorage.getItem("token");
    if (!token) return router.replace("/");

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp < Date.now() / 1000) throw new Error("Token expired");

      const guard = checkRoleGuard(pathname, payload);
      if (!guard.allowed) return router.replace(guard.redirect || "/");

      const res = await axios.get(`${config.apiUrl}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser({
        user_id: res.data.user_id,
        user_fname: res.data.user_fname || "",
        user_lname: res.data.user_lname || "",
        user_img: res.data.user_img || null,
        user_name: res.data.user_name || null,
      });
    } catch {
      localStorage.removeItem("token");
      router.replace("/");
    }
  };

  fetchUserAndCheckToken();
}, [router, pathname]);

useEffect(() => {
  if (!user?.user_id) return;

  socket.emit("join", `user:${user.user_id}`);

  function handleUserUpdate(data: any) {
    setUser((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
      ),
    }));
  }

  socket.on("user:updated", handleUserUpdate);
  socket.on("upload_avatar", handleUserUpdate);

  return () => {
    socket.off("user:updated", handleUserUpdate);
    socket.off("upload_avatar", handleUserUpdate);
  };
}, [user?.user_id]);



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

 <button
   type="button"
   onClick={() => router.push("/backoffice/profile")}
  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push("/backoffice/profile")}
  title="เปิดโปรไฟล์ (Backoffice)"
   className="rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer"
   aria-label="เปิดโปรไฟล์"
 >
<Image
  src={normalizeAvatarUrl(user?.user_img)}
  alt="User Avatar"
  width={32}
  height={32}
  className="h-8 w-8 rounded-full border border-white object-cover"
/>

 </button>

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
