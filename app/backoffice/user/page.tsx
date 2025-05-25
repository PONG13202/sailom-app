'use client';
// sailom\app\backoffice\user\page.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { config } from '../../config';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/ui/Datable';

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
  {
    id: 'user_id', // Explicit ID
    accessorKey: 'user_id',
    header: 'ID',
    cell: ({ getValue }) => (
      <div className="w-[60px]" data-label="ID">{getValue<number>()}</div>
    ),
  },
  {
    id: 'user_fname',
    accessorKey: 'user_fname',
    header: 'ชื่อ',
    cell: ({ getValue }) => (
      <div className="min-w-[100px] max-w-[150px]" data-label="ชื่อ">{getValue<string>()}</div>
    ),
  },
  {
    id: 'user_lname',
    accessorKey: 'user_lname',
    header: 'นามสกุล',
    cell: ({ getValue }) => (
      <div className="min-w-[100px] max-w-[150px]" data-label="นามสกุล">{getValue<string>()}</div>
    ),
  },
  {
    id: 'user_email',
    accessorKey: 'user_email',
    header: 'Email',
    cell: ({ getValue }) => (
      <div className="min-w-[120px] max-w-[200px] hidden sm:table-cell" data-label="Email">{getValue<string>()}</div>
    ),
  },
  {
    id: 'user_phone',
    accessorKey: 'user_phone',
    header: 'เบอร์โทร',
    cell: ({ getValue }) => (
      <div className="min-w-[100px] max-w-[150px] hidden sm:table-cell" data-label="เบอร์โทร">{getValue<string>()}</div>
    ),
  },
  {
    id: 'user_img',
    accessorKey: 'user_img',
    header: 'รูป',
    cell: ({ getValue }) => {
      const imgUrl = getValue<string>();
      const fullUrl = imgUrl && !imgUrl.startsWith('http') ? `${config.apiUrl}${imgUrl}` : imgUrl;
      return fullUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullUrl}
          alt="User"
          className="h-10 w-10 rounded-full object-cover"
          loading="lazy"
          data-label="รูป"
        />
      ) : (
        <img
          src="/user_default.jpeg"
          alt="User"
          className="h-10 w-10 rounded-full object-cover"
          loading="lazy"
          data-label="รูป"
        />
      );
    },
  },
  {
    id: 'user_status',
    accessorKey: 'user_status',
    header: 'สถานะ',
    cell: ({ getValue }) => {
      const status = getValue<number>();
      return (
        <div className="w-[80px]" data-label="สถานะ">{status === 1 ? 'ปกติ' : 'ระงับ'}</div>
      );
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
        timer: 2000,
      });
      router.replace('/');
    }
  }, [router]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${config.apiUrl}/all_user`);
      if (res.status === 200) {
        const mappedData = res.data.map((user: any) => ({
          user_id: user.user_id,
          user_fname: user.First_Name || user.user_fname || '',
          user_lname: user.Last_Name || user.user_lname || '',
          user_email: user.Email || user.user_email || '',
          user_phone: user.Phone || user.user_phone || '',
          user_img: user.Image || user.user_img || '',
          user_status: user.Status || user.user_status || 0,
        }));
        setUsers(mappedData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">รายชื่อผู้ใช้</h2>
      <DataTable columns={columns} data={users} />
    </div>
  );
}