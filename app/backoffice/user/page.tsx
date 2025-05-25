'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from "sweetalert2";
import axios from "axios";
import { config } from '../../config';

export default function User() {
  const router = useRouter();

  const fetchData = async () => {
    try {
      const res = await axios.get(`${config.apiUrl}/all_user`);
      if (res.status === 200) {
        return res.data;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
    }
  };

  useEffect(() => {
    let table : any;
    const loadData = async () => {
      const data = await fetchData();
      if (data) {
        table = $('#userTable').DataTable();
        table.clear();
        data.forEach((user: any) => {

      const profileImg = user.user_img && user.user_img.trim() !== '' ? user.user_img: '/user_default.jpeg';

          table.row.add([
            user.user_id,
            user.user_fname, // สมมติว่าไม่มี user_username ในโค้ดเดิม
            user.user_fname,
            user.user_lname,
            user.user_email,
            user.user_phone,
             `<img src="${profileImg}" alt="Profile" width="50" height="50" style="object-fit: cover; border-radius: 50%;" />`,
            user.user_status
          ]);
        });
        table.draw();
      }
    };

    // Initialize DataTable on first render
    $(document).ready(function () {
      table = $('#userTable').DataTable();
      loadData();
    });

    // Cleanup function to destroy DataTable on unmount
    return () => {
      if (table) {
        table.destroy();
      }
    };
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">รายชื่อผู้ใช้</h2>
      <div className="overflow-x-auto">
        <table id="userTable" className="display w-full text-sm text-left">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>ชื่อ</th>
              <th>นามสกุล</th>
              <th>Email</th>
              <th>เบอร์โทร</th>
              <th>รูปภาพ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {/* DataTables will populate this */}
          </tbody>
        </table>
      </div>
    </div>
  );
}