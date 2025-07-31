"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { config } from "../../config";
import { socket } from "../../socket"; 
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../components/ui/Datable";
import { AddUserModal } from "../../components/ui/AddUserModal";
import { EditUserModal } from "../../components/ui/EditUserModal";
import { DeleteUserModal } from "../../components/ui/DeleteUserModal";

// Import Heroicons
import {
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Type for the user data used in the frontend
type User = {
  user_id: number;
  user_name: string;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_phone: string;
  user_img: string;
  user_status: number;
  isAdmin: boolean;
};

// Interface for the expected API response structure for a single user
interface ApiUserResponse {
  user_id: number;
  user_name: string | null;
  user_fname: string | null;
  user_lname: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_img: string | null;
  user_status: number | null;
  isAdmin: boolean;
}

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(
    async (showSpinner: boolean = true) => {
      if (showSpinner) setIsLoading(true);
      setFetchError(null);

      try {
        const response = await axios.get<ApiUserResponse[]>(
          `${config.apiUrl}/all_user`
        );

        if (response.status === 200 && Array.isArray(response.data)) {
          const mappedData = response.data.map(
            (apiUser: ApiUserResponse): User => ({
              user_id: apiUser.user_id,
              user_name: apiUser.user_name || "ไม่มีข้อมูล",
              user_fname: apiUser.user_fname || "ไม่มีข้อมูล",
              user_lname: apiUser.user_lname || "ไม่มีข้อมูล",
              user_email: apiUser.user_email || "ไม่มีข้อมูล",
              user_phone: apiUser.user_phone || "ไม่มีข้อมูล",
              user_img: apiUser.user_img || "",
              user_status:
                typeof apiUser.user_status === "number"
                  ? apiUser.user_status
                  : 0,
              isAdmin: apiUser.isAdmin,
            })
          );
          setUsers(mappedData);
        } else {
          console.error(
            "Unexpected API response structure or non-200 status:",
            response
          );
          setFetchError(
            "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ หรือโครงสร้างข้อมูลที่ได้รับไม่ถูกต้อง"
          );
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError;
          if (
            axiosError.response?.status === 401 ||
            axiosError.response?.status === 403
          ) {
            Swal.fire({
              icon: "error",
              title: "การยืนยันตัวตนล้มเหลว",
              text: "เซสชั่นของคุณอาจหมดอายุ หรือคุณไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
              confirmButtonText: "ไปยังหน้าเข้าสู่ระบบ",
              allowOutsideClick: false,
            }).then(() => {
              localStorage.removeItem("token");
              localStorage.removeItem("tempToken");
              router.replace("/");
            });
            return;
          }
          setFetchError(
            `เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ${axiosError.message}`
          );
        } else if (err instanceof Error) {
          setFetchError(`เกิดข้อผิดพลาดบางอย่าง: ${err.message}`);
        } else {
          setFetchError("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุขณะดึงข้อมูลผู้ใช้");
        }
      } finally {
        if (showSpinner) setIsLoading(false);
      }
    },
    [router]
  );
  

  // Column definitions for the DataTable
  const columns: ColumnDef<User>[] = [
    {
      id: "user_id",
      accessorKey: "user_id",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <IdentificationIcon className="h-5 w-5 text-gray-500" /> ID
        </div>
      ),
      meta: { headerLabel: "รหัส" },
      cell: ({ row }) => (
        <div className="w-[50px] text-center font-medium text-gray-700">
          {row.original.user_id}
        </div>
      ),
    },
    {
      id: "user_img",
      accessorKey: "user_img",
      header: () => <div className="text-center">รูป</div>,
      // <<< เพิ่ม meta.excludeFromSearch: true ที่นี่
      meta: { headerLabel: "รูปโปรไฟล์", excludeFromSearch: true },
      cell: ({ row }) => {
        const imgUrl = row.original.user_img;
        const baseUrl = config.apiUrl.endsWith("/")
          ? config.apiUrl.slice(0, -1)
          : config.apiUrl;
        const fullUrl =
          imgUrl && !imgUrl.startsWith("http")
            ? `${baseUrl}${imgUrl.startsWith("/") ? imgUrl : `/${imgUrl}`}`
            : imgUrl;
        const defaultImgPath = "/user_default.jpeg";

        return (
          <div className="flex justify-center items-center w-[60px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullUrl || defaultImgPath}
              alt={`รูปของ ${row.original.user_fname}`}
              className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultImgPath;
              }}
            />
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "user_fname",
      accessorKey: "user_fname",
      header: "ชื่อ",
      meta: { headerLabel: "ชื่อจริง" },
      cell: ({ row }) => (
        <div className="min-w-[120px] text-gray-800">
          {row.original.user_fname}
        </div>
      ),
    },
    {
      id: "user_lname",
      accessorKey: "user_lname",
      header: "นามสกุล",
      meta: { headerLabel: "นามสกุล" },
      cell: ({ row }) => (
        <div className="min-w-[120px] text-gray-800">
          {row.original.user_lname}
        </div>
      ),
    },
    {
      id: "user_email",
      accessorKey: "user_email",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <EnvelopeIcon className="h-5 w-5 text-gray-500" /> Email
        </div>
      ),
      meta: { headerLabel: "อีเมล" },
      cell: ({ row }) => (
        <div className="min-w-[180px] hidden sm:table-cell text-gray-600">
          {row.original.user_email}
        </div>
      ),
    },
    {
      id: "user_phone",
      accessorKey: "user_phone",
      header: ({ column }) => (
        <div className="flex items-center justify-center gap-1">
          <PhoneIcon className="h-5 w-5 text-gray-500  " /> เบอร์โทร
        </div>
      ),
      meta: { headerLabel: "เบอร์โทรศัพท์" },
      cell: ({ row }) => (
        <div className="min-w-[120px] hidden sm:table-cell text-gray-600">
          {row.original.user_phone}
        </div>
      ),
    },
    {
      id: "user_status",
      accessorFn: (row) => (row.user_status === 1 ? "ปกติ" : "ระงับ"),
      header: ({ column }) => (
        <div className="text-center flex items-center justify-center  gap-1">
          สถานะ
        </div>
      ),
      meta: { headerLabel: "สถานะบัญชี" },
      cell: ({ row }) => {
        const status = row.original.user_status;
        return (
          <div className="flex justify-center items-center gap-1">
            {status === 1 ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span
              className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${
                status === 1
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {status === 1 ? "ปกติ" : "ระงับ"}
            </span>
          </div>
        );
      },
    },
    {
      id: "user_role",
      accessorFn: (row) => (row.isAdmin ? "ผู้ดูแล" : "ผู้ใช้งาน"),
      header: ({ column }) => (
        <div className="text-center flex items-center justify-center gap-1">
          สิทธิ์
        </div>
      ),
      meta: { headerLabel: "สิทธิ์ผู้ใช้" },
      cell: ({ row }) => {
        const role = row.original.isAdmin;
        return (
          <div className="flex justify-center items-center gap-1">
            {role ? (
              <ShieldCheckIcon className="h-5 w-5 text-yellow-600" />
            ) : (
              <UserIcon className="h-5 w-5 text-gray-500" />
            )}
            <span
              className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${
                role
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                  : "bg-gray-100 text-gray-800 border border-gray-300"
              }`}
            >
              {role ? "ผู้ดูแล" : "ผู้ใช้งาน"}
            </span>
          </div>
        );
      },
    },

    {
      id: "actions",
      header: () => (
        <div className="text-center">
          <span className="sr-only">จัดการ</span>จัดการ
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <EditUserModal user={row.original} onRefresh={fetchData}>
            <PencilSquareIcon className="h-5 w-5 text-blue-500" />
          </EditUserModal>
          <DeleteUserModal
            userId={row.original.user_id}
            user_fname={row.original.user_fname}
            user_lname={row.original.user_lname}
            onRefresh={fetchData}
          >
            <TrashIcon className="h-5 w-5 text-red-500" />
          </DeleteUserModal>
        </div>
      ),
      enableSorting: false,
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "จำเป็นต้องเข้าสู่ระบบ",
        text: "กรุณาเข้าสู่ระบบเพื่อใช้งาน",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false,
      }).then(() => {
        localStorage.removeItem("token");
        router.replace("/");
      });
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [fetchData, router]);
  useEffect(() => {
  // ฟัง socket เพื่อโหลดข้อมูลใหม่เมื่อมีผู้ใช้เพิ่ม
  socket.on("new_user", () => {
    console.log("มีผู้ใช้ใหม่ ถูกเพิ่มเข้าระบบ");
    fetchData(false); // รีเฟรชข้อมูลแบบไม่แสดง spinner
  });

  return () => {
    socket.off("new_user");
  };
}, [fetchData]);

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col justify-center items-center min-h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-sky-600 mb-6"></div>
        <p className="text-xl text-gray-700 font-semibold">
          กำลังโหลดข้อมูลผู้ใช้...
        </p>
        <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <UserIcon className="h-7 w-7 text-sky-600" /> ข้อมูลผู้ใช้งานระบบ
        </h1>
        <AddUserModal onRefresh={fetchData}>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-sky-600 text-white hover:bg-sky-700 h-10 px-4 py-2 shadow-md gap-2">
            <UserPlusIcon className="h-5 w-5" /> เพิ่มผู้ใช้งานใหม่
          </button>
        </AddUserModal>
      </div>

      
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-4">
          <p className="text-sm text-gray-600">
            จำนวนผู้ใช้งานทั้งหมด:{" "}
            <span className="font-semibold text-gray-800">
              {users.length}
            </span>
          </p>
        </div>

        {fetchError && !isLoading && (
          <div
            className="p-4 my-4 text-sm text-red-800 bg-red-100 rounded-lg border-2 border-red-300 shadow-md"
            role="alert"
          >
            <div className="flex items-center">
              <strong className="font-bold mr-1">เกิดข้อผิดพลาด:</strong>
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="mt-3 ml-auto block px-4 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="ค้นหา (ID, ชื่อ, อีเมล, เบอร์โทร...)"
          defaultSortColumnId="user_id"
          noDataMessage={
            fetchError
              ? "ไม่สามารถโหลดข้อมูลได้ โปรดลองอีกครั้ง"
              : "ไม่พบข้อมูลผู้ใช้งานในระบบ"
          }
        />
      </div>
    
  );
}