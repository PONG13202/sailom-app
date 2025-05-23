"use client";
// sailom\app\backoffice\user\page.tsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { config } from "../../config";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../components/ui/Datable";




type User = {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_phone: string;
  user_img: string;
  user_status: number;
};

const columns: ColumnDef<User>[] = [
  { accessorKey: "user_id", header: "ID" },
  { accessorKey: "user_fname", header: "ชื่อ" },
  { accessorKey: "user_lname", header: "นามสกุล" },
  { accessorKey: "user_email", header: "Email" },
  { accessorKey: "user_phone", header: "เบอร์โทร" },
  {
    accessorKey: "user_img",
    header: "รูป",
    cell: ({ getValue }) => {
      const imgUrl = getValue<string>();
      return imgUrl ? (
        <img src={imgUrl} alt="User" className="h-10 w-10 rounded-full object-cover" loading="lazy" onError={(e) => {
            e.currentTarget.src = "user_default.jpeg";
          }} />
      ) : (
        <span>ไม่มีรูป</span>
      );
    },
  },
  {
    accessorKey: "user_status",
    header: "สถานะ",
    cell: ({ getValue }) => {
      const status = getValue<number>();
      return status === 1 ? "ปกติ" : "ระงับ";
    },
  },
];

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

    useEffect(() => {
      const token = localStorage.getItem('token');
      if (!token) {
         Swal.fire({
            icon: 'error',
            title: 'หมดเวลาการใช้งาน',
            text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
            showConfirmButton: false,
            timer: 2000
          })
         router.replace('/');
      }
    }, [router]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${config.apiUrl}/all_user`);
      if (res.status === 200) {
        // Optional: Map data if API field names differ
        const mappedData = res.data.map((user: any) => ({
          user_id: user.user_id,
          user_fname: user.First_Name || user.user_fname || "",
          user_lname: user.Last_Name || user.user_lname || "",
          user_email: user.Email || user.user_email || "",
          user_phone: user.Phone || user.user_phone || "",
          user_img: user.Image || user.user_img || "",
          user_status: user.Status || user.user_status || 0,
        }));
        setUsers(mappedData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">รายชื่อผู้ใช้</h2>
      <DataTable columns={columns} data={users} />
    </div>
  );
}
