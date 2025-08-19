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
import Image, { type ImageLoader } from "next/image";

// shadcn/ui
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
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
} from "@heroicons/react/24/outline";

/* ======================= Styles ======================= */
const selectBase =
  "h-9 px-3 rounded-md border text-sm shadow-sm transition-colors focus:outline-none " +
  "data-[state=open]:bg-inherit data-[state=open]:text-inherit data-[state=open]:border-inherit";

const getStatusTriggerClasses = (
  value: "active" | "suspended",
  editable: boolean
) => {
  const common = editable ? "" : "opacity-60 cursor-not-allowed";
  if (value === "active") {
    return `${selectBase} bg-green-50 text-green-700 border-green-300 hover:bg-green-100 focus:ring-2 focus:ring-green-300 data-[state=open]:ring-2 data-[state=open]:ring-green-300 ${common}`;
  }
  return `${selectBase} bg-red-50 text-red-700 border-red-300 hover:bg-red-100 focus:ring-2 focus:ring-red-300 data-[state=open]:ring-2 data-[state=open]:ring-red-300 ${common}`;
};

const menuContentClass =
  "bg-white border border-slate-200 shadow-lg rounded-md ";
const itemClass =
  "data-[highlighted]:bg-muted data-[highlighted]:text-foreground cursor-pointer";

/* ======================= Types ======================= */
type Role = "user" | "staff" | "admin";

type User = {
  user_id: number;
  user_name: string;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_phone: string;
  user_img: string;
  user_status: number; // 1=active, 0=suspended
  roles: Role[]; // multi-roles
  isAdmin: boolean;
  isStaff: boolean;
};

interface ApiUserResponse {
  user_id: number;
  user_name: string | null;
  user_fname: string | null;
  user_lname: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_img: string | null;
  user_status: number | null;
  // รองรับทั้งรูปแบบเก่า/ใหม่
  isAdmin?: boolean;
  isStaff?: boolean;
  roles?: Role[] | null;
}

/* ======================= Small Components ======================= */
// next/image + fallback + loader ตรงผ่าน เพื่อเลี่ยง error โดเมน (ถ้ายังไม่ตั้งค่าใน next.config)
const passthroughLoader: ImageLoader = ({ src }) => src;

function AvatarImage({
  src,
  alt,
  size = 40,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  const finalSrc = !err && src ? src : "/user_default.jpeg";
  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={size}
      height={size}
      className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
      sizes={`${size}px`}
      onError={() => setErr(true)}
      priority={false}
      loader={passthroughLoader}
      unoptimized
    />
  );
}

/* ======================= Page ======================= */
export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  /* === helper: header สำหรับ auth === */
  const authHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  /* === helper: กล่องขอรหัสผ่าน === */
  const promptPassword = async (title: string) => {
    const { value: password, isConfirmed } = await Swal.fire({
      icon: "question",
      title,
      input: "password",
      inputLabel: "กรอกรหัสผ่านเพื่อยืนยัน",
      inputPlaceholder: "รหัสผ่าน",
      inputAttributes: { autocapitalize: "off", autocorrect: "off" },
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      preConfirm: (val) => {
        if (!val || val.trim().length < 6) {
          Swal.showValidationMessage("กรุณากรอกรหัสผ่านให้ถูกต้อง (อย่างน้อย 6 ตัว)");
          return;
        }
      },
    });
    return isConfirmed ? (password as string) : null;
  };

  // ผู้ใช้ปัจจุบัน
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    isAdmin: boolean;
    isStaff: boolean;
  } | null>(null);

  const fetchData = useCallback(
    async (showSpinner: boolean = true) => {
      if (showSpinner) setIsLoading(true);
      setFetchError(null);

      try {
        const response = await axios.get<ApiUserResponse[]>(
          `${config.apiUrl}/all_user`
        );

        if (response.status === 200 && Array.isArray(response.data)) {
          const mappedData = response.data.map((apiUser): User => {
            let roles: Role[] = [];
            if (apiUser.roles && Array.isArray(apiUser.roles)) {
              roles = apiUser.roles;
            } else {
              if (apiUser.isAdmin) roles.push("admin");
              if (apiUser.isStaff) roles.push("staff");
              if (!apiUser.isAdmin && !apiUser.isStaff) roles.push("user");
            }
            if (roles.length === 0) roles = ["user"];

            const imgUrl = apiUser.user_img || "";
            const baseUrl = config.apiUrl.endsWith("/")
              ? config.apiUrl.slice(0, -1)
              : config.apiUrl;
            const fullUrl: string =
              imgUrl && !imgUrl.startsWith("http")
                ? `${baseUrl}${imgUrl.startsWith("/") ? imgUrl : `/${imgUrl}`}`
                : imgUrl;

            return {
              user_id: apiUser.user_id,
              user_name: apiUser.user_name || "ไม่มีข้อมูล",
              user_fname: apiUser.user_fname || "ไม่มีข้อมูล",
              user_lname: apiUser.user_lname || "ไม่มีข้อมูล",
              user_email: apiUser.user_email || "ไม่มีข้อมูล",
              user_phone: apiUser.user_phone || "ไม่มีข้อมูล",
              user_img: fullUrl,
              user_status:
                typeof apiUser.user_status === "number"
                  ? apiUser.user_status
                  : 0,
              roles,
              isAdmin: roles.includes("admin"),
              isStaff: roles.includes("staff"),
            };
          });
          setUsers(mappedData);
        } else {
          setFetchError(
            "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ หรือโครงสร้างข้อมูลที่ได้รับไม่ถูกต้อง"
          );
        }
      } catch (err) {
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

  // อ่าน token → set currentUser
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
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUser({
        id: Number(payload.id),
        isAdmin: !!payload.isAdmin,
        isStaff: !!payload.isStaff,
      });
    } catch (e) {
      console.warn("Cannot parse token payload", e);
    }
    fetchData();
  }, [fetchData, router]);

  /* ======================= Permission helpers ======================= */
  const canEditOrChange = (target: User) => {
    if (!currentUser) return false;

    const actorIsAdmin = currentUser.isAdmin;
    const actorIsStaff = currentUser.isStaff;
    const targetIsAdmin = target.roles.includes("admin");

    // staff: read-only
    if (actorIsStaff && !actorIsAdmin) return false;

    // admin: ห้ามแก้ admin คนอื่นที่ไม่ใช่ตัวเอง
    if (actorIsAdmin) {
      if (targetIsAdmin && target.user_id !== currentUser.id) return false;
      return true;
    }
    return false;
  };

  const canDelete = (target: User) => {
    if (!currentUser) return false;
    const actorIsAdmin = currentUser.isAdmin;
    const actorIsStaff = currentUser.isStaff;
    const targetIsAdmin = target.roles.includes("admin");

    if (actorIsStaff && !actorIsAdmin) return false; // staff ลบไม่ได้
    if (target.user_id === currentUser.id) return false; // ห้ามลบตัวเอง
    if (actorIsAdmin && targetIsAdmin) return false; // admin ห้ามลบ admin คนอื่น
    return actorIsAdmin;
  };

  /* ======================= API actions (with password confirm) ======================= */
  const updateUserStatus = async (
    userId: number,
    nextStatus: number,
    password: string
  ) => {
    // กันการระงับตัวเอง
    if (currentUser && currentUser.id === userId && nextStatus === 0) {
      Swal.fire({
        icon: "warning",
        title: "ทำรายการไม่ได้",
        text: "คุณไม่สามารถระงับบัญชีของตนเองได้",
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }

    try {
      await axios.put(
        `${config.apiUrl}/users/${userId}/status`,
        { status: nextStatus, password },
        { headers: authHeader() }
      );
      Swal.fire({
        icon: "success",
        title: "อัปเดตสถานะแล้ว",
        timer: 1100,
        showConfirmButton: false,
      });
      fetchData(false);
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "อัปเดตสถานะไม่สำเร็จ",
        text: e?.response?.data?.message || e.message,
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  const updateUserRoles = async (userId: number, roles: Role[], password: string) => {
    try {
      await axios.put(
        `${config.apiUrl}/users/${userId}/roles`,
        { roles, password },
        { headers: authHeader() }
      );
      Swal.fire({
        icon: "success",
        title: "อัปเดตสิทธิ์แล้ว",
        timer: 1100,
        showConfirmButton: false,
      });
      fetchData(false);
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "อัปเดตสิทธิ์ไม่สำเร็จ",
        text: e?.response?.data?.message || e.message,
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  // ยืนยันก่อนเปลี่ยนสถานะ + ขอรหัสผ่าน
  const confirmChangeStatus = (u: User, val: "active" | "suspended") => {
    const label = val === "active" ? "ปกติ" : "ระงับ";
    Swal.fire({
      icon: "question",
      title: "ยืนยันการเปลี่ยนสถานะ?",
      text: `คุณต้องการเปลี่ยนสถานะของ ${u.user_fname} เป็น "${label}" ใช่หรือไม่`,
      showCancelButton: true,
      confirmButtonText: "ดำเนินการต่อ",
      cancelButtonText: "ยกเลิก",
    }).then(async (r) => {
      if (!r.isConfirmed) return;

      const pwd = await promptPassword("ยืนยันรหัสผ่านเพื่อเปลี่ยนสถานะ");
      if (!pwd) return;

      await updateUserStatus(u.user_id, val === "active" ? 1 : 0, pwd);
    });
  };

  // กล่องจัดการสิทธิ์ (หลายสิทธิ์) + validation: ห้ามถอด admin ของตัวเอง, ต้องมีอย่างน้อย 1 สิทธิ์ + ขอรหัสผ่าน
  const openManageRoles = (u: User) => {
    const has = (r: Role) => u.roles.includes(r);
    const checkbox = (id: string, label: string, checked: boolean) =>
      `<label style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0;">
        <input id="${id}" type="checkbox" ${checked ? "checked" : ""} />
        <span>${label}</span>
      </label>`;

    Swal.fire({
      title: `จัดการสิทธิ์: ${u.user_fname} ${u.user_lname}`,
      html: `
        <div style="text-align:left ">
          ${checkbox("role_admin", "ผู้ดูแล (admin)", has("admin"))}
          ${checkbox("role_staff", "พนักงาน (staff)", has("staff"))}
          ${checkbox("role_user", "ผู้ใช้งาน (user)", has("user"))}
          <small style="color:#6b7280;display:block;margin-top:.5rem;">
            * 1 คนมีได้หลายสิทธิ์ &nbsp;|&nbsp; ผู้ดูแลไม่สามารถถอดสิทธิ์ผู้ดูแลของตัวเอง
          </small>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const admin = (
          Swal.getPopup()!.querySelector("#role_admin") as HTMLInputElement
        )?.checked;
        const staff = (
          Swal.getPopup()!.querySelector("#role_staff") as HTMLInputElement
        )?.checked;
        const user = (
          Swal.getPopup()!.querySelector("#role_user") as HTMLInputElement
        )?.checked;

        const next = [
          admin ? "admin" : null,
          staff ? "staff" : null,
          user ? "user" : null,
        ].filter(Boolean) as Role[];

        if (next.length === 0) {
          Swal.showValidationMessage("กรุณาเลือกอย่างน้อย 1 สิทธิ์");
          return;
        }

        if (
          currentUser &&
          u.user_id === currentUser.id &&
          u.roles.includes("admin") &&
          !next.includes("admin")
        ) {
          Swal.showValidationMessage(
            "คุณไม่สามารถถอดสิทธิ์ผู้ดูแล (admin) ของตนเองได้"
          );
          return;
        }

        return next;
      },
    }).then(async (res) => {
      if (res.isConfirmed && Array.isArray(res.value)) {
        const pwd = await promptPassword("ยืนยันรหัสผ่านเพื่อปรับสิทธิ์");
        if (!pwd) return;

        await updateUserRoles(u.user_id, res.value as Role[], pwd);
      }
    });
  };
  // socket realtime for users
useEffect(() => {
  if (!socket.connected) socket.connect();

  // (ไม่จำเป็น แต่ทำให้จัดกลุ่มง่าย ถ้าภายหลังอยาก emit เป็นห้อง)
  socket.emit("join", "users");

  const refetch = () => fetchData(false);

  // สร้าง/แก้ไขข้อมูลผู้ใช้ -> refetch เพื่อให้ roles/safe mapping ถูกต้องเสมอ
const onCreated = () => refetch();
const onUpdated = () => refetch();
const onNewUser = () => refetch();

  // เปลี่ยนสถานะ -> อัปเดตในที่เดียว ไม่ต้อง refetch ทั้งหมด
  const onStatusUpdated = ({ user_id, user_status }: { user_id: number; user_status: number }) => {
    setUsers(prev => prev.map(u => (u.user_id === user_id ? { ...u, user_status } : u)));
  };

  // เปลี่ยนสิทธิ์ -> อัปเดต roles/isAdmin/isStaff
  const onRolesUpdated = ({
    user_id,
    roles,
  }: {
    user_id: number;
    roles: ("admin" | "staff" | "user")[];
  }) => {
    setUsers(prev =>
      prev.map(u =>
        u.user_id === user_id
          ? {
              ...u,
              roles,
              isAdmin: roles.includes("admin"),
              isStaff: roles.includes("staff"),
            }
          : u
      )
    );
  };

  // ลบผู้ใช้ -> ลบออกจากตาราง
  const onDeleted = ({ user_id }: { user_id: number }) => {
    setUsers(prev => prev.filter(u => u.user_id !== user_id));
  };

  socket.on("user:created", onCreated);
  socket.on("user:updated", onUpdated);
  socket.on("user:status_updated", onStatusUpdated);
  socket.on("user:roles_updated", onRolesUpdated);
  socket.on("user:deleted", onDeleted);
  socket.on("new_user", onNewUser); // backward-compatible

  // debug ถ้าต้องการดูอีเวนต์ที่เข้ามา
  // socket.onAny((event, ...args) => console.log("[socket]", event, args));

  return () => {
    socket.off("user:created", onCreated);
    socket.off("user:updated", onUpdated);
    socket.off("user:status_updated", onStatusUpdated);
    socket.off("user:roles_updated", onRolesUpdated);
    socket.off("user:deleted", onDeleted);
    socket.off("new_user", onNewUser);
    socket.emit("leave", "users");
  };
}, [fetchData]);


  /* ======================= Columns ======================= */
  const columns: ColumnDef<User>[] = [
    {
      id: "user_id",
      accessorKey: "user_id",
      header: () => (
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
      meta: { headerLabel: "รูปโปรไฟล์", excludeFromSearch: true },
      cell: ({ row }) => (
        <div className="flex justify-center items-center w-[60px]">
          <AvatarImage
            src={row.original.user_img}
            alt={`รูปของ ${row.original.user_fname}`}
            size={40}
          />
        </div>
      ),
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
      header: () => (
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
      header: () => (
        <div className="flex items-center justify-center gap-1">
          <PhoneIcon className="h-5 w-5 text-gray-500" /> เบอร์โทร
        </div>
      ),
      meta: { headerLabel: "เบอร์โทรศัพท์" },
      cell: ({ row }) => (
        <div className="min-w-[120px] hidden sm:table-cell text-gray-600">
          {row.original.user_phone}
        </div>
      ),
    },
    // ====== สถานะ (มี confirm + รหัสผ่าน) ======
    {
      id: "user_status",
      accessorFn: (row) => (row.user_status === 1 ? "ปกติ" : "ระงับ"),
      header: () => (
        <div className="text-center flex items-center justify-center gap-1">
          สถานะ
        </div>
      ),
      meta: { headerLabel: "สถานะบัญชี" },
      cell: ({ row }) => {
        const u = row.original;
        const editable = canEditOrChange(u);
        const value: "active" | "suspended" =
          u.user_status === 1 ? "active" : "suspended";
        return (
          <div className="flex justify-center items-center gap-2">
            {u.user_status === 1 ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <Select
              value={value}
              disabled={!editable}
              onValueChange={(val) =>
                confirmChangeStatus(u, val as "active" | "suspended")
              }
            >
              <SelectTrigger
                className={getStatusTriggerClasses(value, editable)}
              >
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent className={menuContentClass}>
                <SelectItem className={itemClass} value="active">
                  ปกติ
                </SelectItem>
                <SelectItem className={itemClass} value="suspended">
                  ระงับ
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    // ====== สิทธิ์ (หลายสิทธิ์ + ยืนยัน + รหัสผ่าน) ======
    {
      id: "user_roles",
      accessorFn: (row) => row.roles.join(", "),
      header: () => (
        <div className="text-center flex items-center justify-center gap-1">
          สิทธิ์
        </div>
      ),
      meta: { headerLabel: "สิทธิ์ผู้ใช้" },
      cell: ({ row }) => {
        const u = row.original;
        const editable = canEditOrChange(u);

        const badge = (label: string, color: string) => (
          <span
            key={label}
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${color}`}
          >
            {label}
          </span>
        );

        return (
          <div className="flex flex-col items-center gap-2">
            <div className=" flex flex-wrap justify-center gap-1">
              {u.roles.includes("admin") &&
                badge("ผู้ดูแล", "bg-amber-100 text-amber-800")}
              {u.roles.includes("staff") &&
                badge("พนักงาน", "bg-indigo-100 text-indigo-700")}
              {u.roles.includes("user") &&
                badge("ผู้ใช้งาน", "bg-slate-100 text-slate-700")}
            </div>

            <button
              disabled={!editable}
              onClick={() => openManageRoles(u)}
              className={`cursor-pointer inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs shadow-sm
                ${
                  editable
                    ? "hover:bg-slate-50"
                    : "opacity-60 cursor-not-allowed"
                }`}
              title={
                editable
                  ? "จัดการสิทธิ์ (เลือกได้หลายสิทธิ์)"
                  : "ไม่มีสิทธิ์แก้ไขผู้ใช้นี้"
              }
            >
              {u.isAdmin ? (
                <ShieldCheckIcon className="h-4 w-4 text-amber-600" />
              ) : (
                <UserIcon className="h-4 w-4 text-gray-600" />
              )}
              จัดการสิทธิ์
            </button>
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
      cell: ({ row }) => {
        const u = row.original;
        const canEdit = canEditOrChange(u);
        const canRemove = canDelete(u);

        return (
          <div className="flex justify-center gap-2">
            <div
              className={`${canEdit ? "" : "opacity-50 pointer-events-none"}`}
              title={
                canEdit
                  ? "แก้ไขผู้ใช้"
                  : "ไม่มีสิทธิ์แก้ไขผู้ใช้นี้ (แอดมินคนอื่นหรือเป็น staff)"
              }
            >
              <EditUserModal user={u} onRefresh={fetchData}>
                <PencilSquareIcon
                  className={`h-5 w-5 ${
                    canEdit ? "text-blue-500" : "text-gray-300"
                  }`}
                />
              </EditUserModal>
            </div>

            <div
              className={`${canRemove ? "" : "opacity-50 pointer-events-none"}`}
              title={
                canRemove
                  ? "ลบผู้ใช้"
                  : "ห้ามลบผู้ใช้รายนี้ (แอดมินคนอื่น/ตนเอง/ไม่มีสิทธิ์)"
              }
            >
              <DeleteUserModal
                userId={u.user_id}
                user_fname={u.user_fname}
                user_lname={u.user_lname}
                onRefresh={fetchData}
              >
                <TrashIcon
                  className={`h-5 w-5 ${
                    canRemove ? "text-red-500" : "text-gray-300"
                  }`}
                />
              </DeleteUserModal>
            </div>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

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
          <span className="font-semibold text-gray-800">{users.length}</span>
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

      <div className="w-full overflow-x-auto">
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
    </div>
  );
}
