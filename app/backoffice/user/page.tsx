'use client';
// sailom\app\backoffice\user\page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation'; // For App Router
import Swal from 'sweetalert2';
import { config } from '../../config'; // Ensure this path is correct (e.g., app/config.ts)
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../../components/ui/Datable'; // Ensure this path is correct (e.g., app/components/ui/Datable.tsx)
// import Image from 'next/image'; // Uncomment if you prefer Next.js Image component

// Type for the user data used in the frontend
type User = {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_email: string;
  user_phone: string;
  user_img: string;
  user_status: number;
};

// Interface for the expected API response structure for a single user
interface ApiUserResponse {
  user_id: number;
  user_name: string | null; // API ส่ง user_name มา
  user_fname: string | null; // API ส่ง user_fname, user_lname ฯลฯ โดยตรง
  user_lname: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_img: string | null;
  user_status: number | null; // หรือ number ถ้ามั่นใจว่าไม่เป็น null
}

// Column definitions for the DataTable
const columns: ColumnDef<User>[] = [
  {
    id: 'user_id', // Explicit ID is good practice
    accessorKey: 'user_id',
    header: 'ID',
    meta: { headerLabel: 'รหัส' }, // For mobile card view label
    cell: ({ row }) => <div className="w-[50px] text-center font-medium text-gray-700">{row.original.user_id}</div>,
  },
  {
    id: 'user_img',
    accessorKey: 'user_img',
    header: () => <div className="text-center">รูป</div>, // Centered header
    meta: { headerLabel: 'รูปโปรไฟล์' },
    cell: ({ row }) => {
      const imgUrl = row.original.user_img;
      const baseUrl = config.apiUrl.endsWith('/') ? config.apiUrl.slice(0, -1) : config.apiUrl;
      const fullUrl = imgUrl && !imgUrl.startsWith('http')
        ? `${baseUrl}${imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`}`
        : imgUrl;
      const defaultImgPath = "/user_default.jpeg"; // Ensure this is in your /public folder

      return (
        <div className="flex justify-center items-center w-[60px]"> {/* Increased width for better centering */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullUrl || defaultImgPath}
            alt={`รูปของ ${row.original.user_fname}`}
            className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = defaultImgPath; }}
          />
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: 'user_fname',
    accessorKey: 'user_fname',
    header: 'ชื่อ',
    meta: { headerLabel: 'ชื่อจริง' },
    cell: ({ row }) => <div className="min-w-[120px] text-gray-800">{row.original.user_fname}</div>,
  },
  {
    id: 'user_lname',
    accessorKey: 'user_lname',
    header: 'นามสกุล',
    meta: { headerLabel: 'นามสกุล' },
    cell: ({ row }) => <div className="min-w-[120px] text-gray-800">{row.original.user_lname}</div>,
  },
  {
    id: 'user_email',
    accessorKey: 'user_email',
    header: 'Email',
    meta: { headerLabel: 'อีเมล' },
    cell: ({ row }) => <div className="min-w-[180px] hidden sm:table-cell text-gray-600">{row.original.user_email}</div>,
  },
  {
    id: 'user_phone',
    accessorKey: 'user_phone',
    header: 'เบอร์โทร',
    meta: { headerLabel: 'เบอร์โทรศัพท์' },
    cell: ({ row }) => <div className="min-w-[120px] hidden sm:table-cell text-gray-600">{row.original.user_phone}</div>,
  },
  {
    id: 'user_status',
    accessorKey: 'user_status',
    header: () => <div className="text-center">สถานะ</div>, // Centered header
    meta: { headerLabel: 'สถานะบัญชี' },
    cell: ({ row }) => {
      const status = row.original.user_status;
      return (
        <div className="flex justify-center">
          <span
            className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm
              ${status === 1
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
              }
            `}
          >
            {status === 1 ? 'ปกติ' : 'ระงับ'}
          </span>
        </div>
      );
    },
  },
  // --- Optional Actions Column ---
  // {
  //   id: 'actions',
  //   header: () => <div className="text-center">ดำเนินการ</div>,
  //   meta: { headerLabel: 'ดำเนินการ'},
  //   cell: ({ row }) => {
  //     const user = row.original;
  //     const handleEdit = (userId: number) => {
  //       // Example: navigate to an edit page
  //       // router.push(`/backoffice/user/edit/${userId}`);
  //       Swal.fire(`แก้ไขผู้ใช้ ID: ${userId}`, '', 'info');
  //     };
  //     const handleDelete = async (userId: number, userName: string) => {
  //       Swal.fire({
  //         title: 'ยืนยันการลบ',
  //         text: `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${userName}" (ID: ${userId})? การกระทำนี้ไม่สามารถย้อนกลับได้`,
  //         icon: 'warning',
  //         showCancelButton: true,
  //         confirmButtonColor: '#e53e3e', // Red-600
  //         cancelButtonColor: '#3182ce', // Blue-500
  //         confirmButtonText: 'ใช่, ลบเลย!',
  //         cancelButtonText: 'ยกเลิก'
  //       }).then(async (result) => {
  //         if (result.isConfirmed) {
  //           // --- Replace with actual delete API call ---
  //           // try {
  //           //   const token = localStorage.getItem('token');
  //           //   await axios.delete(`${config.apiUrl}/api/user/${userId}`, {
  //           //     headers: { Authorization: `Bearer ${token}` }
  //           //   });
  //           //   Swal.fire('ลบสำเร็จ!', `ผู้ใช้ ${userName} ถูกลบแล้ว`, 'success');
  //           //   fetchData(false); // Refresh data without full page loading spinner
  //           // } catch (error) {
  //           //   console.error('Error deleting user:', error);
  //           //   Swal.fire('เกิดข้อผิดพลาด!', 'ไม่สามารถลบผู้ใช้ได้', 'error');
  //           // }
  //           // --- End of API call example ---
  //           Swal.fire('จำลองการลบ!', `ผู้ใช้ ${userName} (ID: ${userId}) ควรจะถูกลบ (นี่คือการจำลอง)`, 'info');
  //         }
  //       });
  //     };

  //     return (
  //       <div className="flex justify-center items-center space-x-2">
  //         <button
  //           onClick={() => handleEdit(user.user_id)}
  //           className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded-md transition-colors duration-150"
  //           title="แก้ไขข้อมูลผู้ใช้"
  //         >
  //           {/* <FaEdit className="w-4 h-4" /> Using an icon library like react-icons is recommended */}
  //           แก้ไข
  //         </button>
  //         <button
  //           onClick={() => handleDelete(user.user_id, `${user.user_fname} ${user.user_lname}`)}
  //           className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors duration-150"
  //           title="ลบผู้ใช้"
  //         >
  //           {/* <FaTrashAlt className="w-4 h-4" /> */}
  //           ลบ
  //         </button>
  //       </div>
  //     );
  //   },
  //   enableSorting: false,
  // },
];

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async (showSpinner: boolean = true) => {
    if (showSpinner) setIsLoading(true);
    setFetchError(null);

    try {
      // const token = localStorage.getItem('token');
      // const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. ปรับ Type ของ axios.get
      const response = await axios.get<ApiUserResponse[]>( // API return array โดยตรง
        `${config.apiUrl}/all_user`,
        // { headers }
      );

      // console.log('Full API Response from Axios:', response);
      // console.log('API Response Data (should be an array):', response.data);

      // 2. ปรับเงื่อนไขการตรวจสอบ Response
      if (response.status === 200 && Array.isArray(response.data)) {
        const mappedData = response.data.map((apiUser: ApiUserResponse): User => ({
          // 4. ปรับ Logic การ Map ข้อมูล
          user_id: apiUser.user_id,
          user_fname: apiUser.user_fname || 'ไม่มีข้อมูล', // Fallback ถ้าเป็น null
          user_lname: apiUser.user_lname || 'ไม่มีข้อมูล',
          user_email: apiUser.user_email || 'ไม่มีข้อมูล',
          user_phone: apiUser.user_phone || 'ไม่มีข้อมูล',
          user_img: apiUser.user_img || '', // Fallback เป็น string ว่าง
          user_status: typeof apiUser.user_status === 'number' ? apiUser.user_status : 0, // Fallback เป็น 0 ถ้าเป็น null หรือ undefined
        }));
        setUsers(mappedData);
      } else {
        console.error('Unexpected API response structure or non-200 status:', response);
        setFetchError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้ หรือโครงสร้างข้อมูลที่ได้รับไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          Swal.fire({
            icon: 'error',
            title: 'การยืนยันตัวตนล้มเหลว',
            text: 'เซสชั่นของคุณอาจหมดอายุ หรือคุณไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
            confirmButtonText: 'ไปยังหน้าเข้าสู่ระบบ',
            allowOutsideClick: false,
          }).then(() => {
            localStorage.removeItem('token');
            router.replace('/');
          });
          return;
        }
        setFetchError(`เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ${axiosError.message}`);
      } else if (err instanceof Error) {
        setFetchError(`เกิดข้อผิดพลาดบางอย่าง: ${err.message}`);
      } else {
        setFetchError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุขณะดึงข้อมูลผู้ใช้');
      }
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [router]);

  // ... (useEffect for token check and initial fetchData call) ...
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'จำเป็นต้องเข้าสู่ระบบ',
        text: 'กรุณาเข้าสู่ระบบเพื่อใช้งาน',
        confirmButtonText: 'ตกลง',
        allowOutsideClick: false,
      }).then(() => {
        router.replace('/');
      });
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [fetchData, router]);


  if (isLoading) {
    return (
      <div className="p-6 flex flex-col justify-center items-center min-h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-sky-600 mb-6"></div>
        <p className="text-xl text-gray-700 font-semibold">กำลังโหลดข้อมูลผู้ใช้...</p>
        <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
          ข้อมูลผู้ใช้งานระบบ
        </h1>
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
        columns={columns} // columns ของคุณน่าจะยังใช้ได้ดี เพราะมัน map จาก User type
        data={users}
        searchPlaceholder="ค้นหา (ID, ชื่อ, อีเมล...)"
        defaultSortColumnId="user_id"
        noDataMessage={fetchError ? "ไม่สามารถโหลดข้อมูลได้ โปรดลองอีกครั้ง" : "ไม่พบข้อมูลผู้ใช้งานในระบบ"}
      />
    </div>
  );
}

