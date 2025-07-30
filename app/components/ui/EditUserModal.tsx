"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import axios from "axios";
import { config } from "../../config";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

export function EditUserModal({
  user,
  onRefresh,
}: {
  user: any;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [user_name, setUser_name] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [user_email, setUser_email] = useState("");
  const [user_pass, setUser_pass] = useState("");
  const [user_phone, setUser_phone] = useState("");
  const [user_img, setUser_img] = useState<File | null>(null); // State สำหรับรูปภาพ

  const [usernameStatus, setUsernameStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  useEffect(() => {
    if (user) {
      setUser_name(user.user_name || "");
      setFname(user.user_fname || "");
      setLname(user.user_lname || "");
      setUser_email(user.user_email || "");
      setUser_pass(user.user_pass || "");
      setUser_phone(user.user_phone || "");
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (user_name.trim() && user_name !== user.user_name) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_username?user_name=${encodeURIComponent(user_name)}`
          );
          setUsernameStatus(res.data.available ? "" : "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว");
        } catch {
          setUsernameStatus("ไม่สามารถตรวจสอบชื่อผู้ใช้ได้");
        }
      } else {
        setUsernameStatus("");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [user_name, user.user_name]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (user_email.trim() && user_email !== user.user_email) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_email?user_email=${encodeURIComponent(user_email)}`
          );
          setEmailStatus(res.data.available ? "" : "อีเมลนี้ถูกใช้ไปแล้ว");
        } catch {
          setEmailStatus("ไม่สามารถตรวจสอบอีเมลได้");
        }
      } else {
        setEmailStatus("");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [user_email, user.user_email]);

  const handleSave = async () => {
    if (usernameStatus || emailStatus) {
      Swal.fire({
        icon: "warning",
        title: "ไม่สามารถบันทึกได้",
        text: "กรุณาแก้ไขชื่อผู้ใช้หรืออีเมลที่ซ้ำก่อน",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData(); // สร้าง FormData สำหรับส่งข้อมูล
      formData.append("user_name", user_name);
      formData.append("user_fname", fname);
      formData.append("user_lname", lname);
      formData.append("user_email", user_email);
      formData.append("user_pass", user_pass);
      formData.append("user_phone", user_phone);
      if (user_img) {
             formData.append("user_img", user_img); // เพิ่มไฟล์รูปภาพถ้ามี
      }

      await axios.put(
        `${config.apiUrl}/update_user/${user.user_id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // ลบ "Content-Type": "multipart/form-data" เพื่อให้ axios จัดการเอง
          },
        }
      );

      await Swal.fire({
        icon: "success",
        title: "แก้ไขข้อมูลสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: message,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="cursor-pointer px-3 py-1 text-sm font-medium"
      >
        แก้ไข
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && (
            <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl shadow-2xl">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-xl text-blue-800">
                    แก้ไขข้อมูลผู้ใช้
                  </DialogTitle>
                </DialogHeader>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <div className="grid gap-4 py-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        ชื่อผู้ใช้
                      </label>
                      <Input
                        value={user_name}
                        onChange={(e) => setUser_name(e.target.value)}
                      />
                      {usernameStatus && (
                        <p className="text-sm text-red-500 mt-1">
                          {usernameStatus}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        รหัสผ่าน
                      </label>
                      <Input
                        type="password"
                        value={user_pass}
                        onChange={(e) => setUser_pass(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          ชื่อจริง
                        </label>
                        <Input
                          value={fname}
                          onChange={(e) => setFname(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          นามสกุล
                        </label>
                        <Input
                          value={lname}
                          onChange={(e) => setLname(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        อีเมล
                      </label>
                      <Input
                        type="email"
                        value={user_email}
                        onChange={(e) => setUser_email(e.target.value)}
                      />
                      {emailStatus && (
                        <p className="text-sm text-red-500 mt-1">{emailStatus}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        เบอร์โทร
                      </label>
                      <Input
                        value={user_phone}
                        onChange={(e) => setUser_phone(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        รูปโปรไฟล์ (เลือกจากเครื่อง)
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUser_img(file); // เก็บไฟล์รูปภาพที่เลือก
                          }
                        }}
                      />
                    </div>
                  </div>

                  <DialogFooter className="mt-2">
                    <Button
                      className="cursor-pointer"
                      type="button"
                      variant="ghost"
                      onClick={() => setOpen(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      บันทึก
                    </Button>
                  </DialogFooter>
                </form>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </>
  );
}
