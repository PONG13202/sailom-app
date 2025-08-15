"use client";
import Link from "next/link";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export default function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
}: SidebarProps) {
  const router = useRouter();
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

  return (
    <aside
      className={`
        fixed top-0 left-0 bg-blue-900 text-white z-30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:static md:translate-x-0
        ${isCollapsed ? "md:w-24" : "md:w-56"}
      `}
      style={{ minHeight: "100vh" }}
    >
      <div className={`flex-1 flex flex-col justify-center`}>
        <div
          className={`border-b border-gray-700 flex ${
            isCollapsed ? "md:justify-center " : "justify-between items-center"
          } px-4 py-4`}
        >
          <button
            onClick={onClose}
            className="text-white text-3xl leading-none md:hidden"
            aria-label="ปิดเมนู"
          >
            &times;
          </button>
        </div>
        <ul className="space-y-2 px-4 py-8 flex-1 flex flex-col justify-center">
          <li>
            <Link
              href="/backoffice/dashboard"
              className={`flex items-center p-2 rounded hover:bg-white hover:text-gray-700 ${
                isCollapsed ? "justify-center" : ""
              }`}
              onClick={onClose}
            >
              <i className="fa-solid fa-chart-line mr-2"></i>
              {!isCollapsed && <span className="text-sm">แดชบอร์ด</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/backoffice/user"
              className={`flex items-center p-2 rounded hover:bg-white hover:text-gray-700 ${
                isCollapsed ? "justify-center" : ""
              }`}
              onClick={onClose}
            >
              <i className="fa-solid fa-user mr-2"></i>
              {!isCollapsed && <span className="text-sm">จัดการผู้ใช้</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/backoffice/table"
              className={`flex items-center p-2 rounded hover:bg-white hover:text-gray-700 ${
                isCollapsed ? "justify-center" : ""
              }`}
              onClick={onClose}
            >
              <i className="fa-solid fa-table mr-2"></i>
              {!isCollapsed && <span className="text-sm">จัดการโต๊ะ</span>}
            </Link>
          </li>
          {/* ประเภทอาหาร */}
          <li>
            <Link
              href="/backoffice/foodtype"
              className={`flex items-center p-2 rounded hover:bg-white hover:text-gray-700 ${
                isCollapsed ? "justify-center" : ""
              }`}
              onClick={onClose}
            >
              <i className="fa-solid fa-list mr-2"></i>
              {!isCollapsed && (
                <span className="text-sm">จัดการประเภทอาหาร</span>
              )}
            </Link>
          </li>
          {/* อาหาร */}
          <li>
            <Link
              href="/backoffice/menu"
              className={`flex items-center p-2 rounded hover:bg-white hover:text-gray-700 ${
                isCollapsed ? "justify-center" : ""
              }`}
              onClick={onClose}
            >
              <i className="fa-solid fa-utensils mr-2"></i>
              {!isCollapsed && <span className="text-sm">จัดการอาหาร</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/backoffice/slide"
              className={`flex items-center p-2 rounded hover:bg-white hover:text-gray-700 ${
                isCollapsed ? "justify-center" : ""
              }`}
              onClick={onClose}
            >
              <i className="fa-solid fa-images mr-2"></i>
              {!isCollapsed && <span className="text-sm">จัดการภาพสไลด์</span>}
            </Link>
          </li>

          <li>
            <button
              onClick={handleLogout}
              className={`flex items-center p-2 rounded text-red-500
                hover:bg-white hover:text-red-700
                w-full text-left ${isCollapsed ? "justify-center" : ""}`}
            >
              <i className="fa-solid fa-right-from-bracket mr-2"></i>
              {!isCollapsed && <span className="text-sm">ออกจากระบบ</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
