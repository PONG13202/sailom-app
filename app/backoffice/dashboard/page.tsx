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
       router.replace('/');
    }
  }, [router]);

 return (
    <div className="h-full p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      {/* คลิป YouTube
      <div className="w-full max-w-4xl md:h-150 mx-auto aspect-w-16 aspect-h-9">
        <iframe
          className="w-full h-full rounded-lg shadow-lg"
          src="https://www.youtube.com/embed/RXRWE_XQ8aE"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div> */}
    </div>
  );
}
