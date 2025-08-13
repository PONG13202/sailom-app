"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "../backoffice/sidebar";
import axios from "axios";
import { config } from "../config";
import Swal from "sweetalert2";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  const [user, setUser] = useState<{
    user_fname: string;
    user_lname: string;
  }>({
    user_fname: "",
    user_lname: "",
  });

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
        if (payload.exp < currentTime) {
          throw new Error("Token expired");
        }

        const res = await axios.get(`${config.apiUrl}/info`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(res.data);
      } catch (err) {
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

    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          // const date = new Date(payload.exp * 1000);
          // console.log(date.toLocaleString());
          const currentTime = Date.now() / 1000;

          if (payload.exp < currentTime) {
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
        } catch (err) {
          localStorage.removeItem("token");
          localStorage.removeItem("tempToken");
          Swal.fire({
            icon: "error",
            title: "หมดเวลาการใช้งาน",
            text: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
            showConfirmButton: false,
            timer: 2000,
          })
          router.replace("/");
        }
      }
    }, 10000); // ทุก 10 วินาที

    return () => clearInterval(interval);
  }, [router]);

  const handleBurgerClick = () => {
    if (window.innerWidth >= 768) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev); // <-- แก้ตรงนี้
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

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <div
          className="fixed inset-0  bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-0" : "md:ml-0"
        }`}
      >
        <header className="bg-blue-900 text-white p-4 flex items-center fixed top-0 left-0 right-0 z-30">
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
          <h1 className="ml-2 text-xl font-semibold">Dashboard</h1>
          <div className="text-sm md:text-base absolute right-4">
            ยินดีต้อนรับ{" "}
            <span className="font-bold text-yellow-500">
              {user.user_fname} {user.user_lname}
            </span>
          </div>
        </header>
        <main className="flex-1 pt-16 p-4 ">{children}</main>
      </div>
    </div>
  );
}
