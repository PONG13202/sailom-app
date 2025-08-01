'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from "sweetalert2";

export default function Dashboard() {
  const router = useRouter();

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
        localStorage.removeItem("token");
        localStorage.removeItem("tempToken");
       router.replace('/');
    }
  }, [router]);

 return (
    <div className="h-full p-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-200 pb-3">Dashboard</h1>
      
    </div>
  );
}
