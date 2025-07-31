// C:\Users\pong1\OneDrive\เอกสาร\End-Pro\sailom\app\ValidateTime.ts
"use client"; // แจ้ง Next.js ว่าไฟล์นี้จะรันฝั่ง client

import axios from 'axios';
import Swal from 'sweetalert2';
// ถ้าคุณต้องการใช้ useRouter คุณต้องแน่ใจว่ามันถูกเรียกใช้ใน client-side context
// สำหรับการ redirect ที่ปลอดภัยจาก interceptor ควรใช้ window.location.href
// import { useRouter } from 'next/navigation'; // ปกติไม่ใช้ตรงนี้โดยตรงใน interceptor

// กำหนด base URL จาก config ของคุณ
import { config } from './config'; // สมมติว่า config.ts มี apiUrl

const apiClient = axios.create({
  baseURL: config.apiUrl, // ใช้ baseURL จาก config ของคุณ
  timeout: 30000, // 10 วินาที
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor ---
// แนบ Token ไปกับทุกๆ Request ถ้ามี
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
// ดักจับ Error Response โดยเฉพาะ 401 (Unauthorized) และ 403 (Forbidden)
apiClient.interceptors.response.use(
  (response) => response, // ถ้าสำเร็จ ให้ผ่านไป
  (error) => {
    // ตรวจสอบว่า Error เป็น Error จาก Backend และมี Status Code 401 หรือ 403
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error("Token หมดอายุหรือไม่ถูกต้อง, กำลังล็อกเอาต์...");

      // ลบ Token ออกจาก localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('tempToken'); // ลบ tempToken ด้วยหากมี

      // แสดง SweetAlert แจ้งผู้ใช้
      Swal.fire({
        icon: 'error',
        title: 'เซสชั่นหมดอายุ',
        text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        showConfirmButton: false, // ไม่ต้องให้ผู้ใช้กดปุ่ม
        timer: 2500, // แสดงข้อความ 2.5 วินาที
        didDestroy: () => {
          // Redirect ไปหน้า Login หลังจาก SweetAlert ปิด
          // ใช้ window.location.href สำหรับการ redirect ทันทีและไม่ขึ้นกับ React Router
          window.location.href = '/'; // Redirect ไปหน้าแรก/หน้า login ของคุณ
        }
      });

      // ปฏิเสธ Promise เพื่อไม่ให้ Error ไปยัง Component ที่เรียก API
      return Promise.reject(error);
    }
    // สำหรับ Error อื่นๆ ให้ส่งผ่านไป
    return Promise.reject(error);
  }
);

export default apiClient;