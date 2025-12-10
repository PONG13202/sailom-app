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
import { Label } from "@/components/ui/label";
import { useState, useEffect, ReactNode } from "react"; // ✅ เพิ่ม ReactNode
import { motion } from "framer-motion";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "../../config";

// ✅ เพิ่ม children?: ReactNode ใน Props
export function AddUserModal({ 
  onRefresh, 
  children 
}: { 
  onRefresh: () => void;
  children?: ReactNode; 
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    user_name: string;
    user_email: string;
    user_pass: string;
    user_fname: string;
    user_lname: string;
    user_phone: string;
    user_img: File | null;
  }>({
    user_name: "",
    user_email: "",
    user_pass: "",
    user_fname: "",
    user_lname: "",
    user_phone: "",
    user_img: null,
  });
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("");

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (form.user_name.trim()) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_username?user_name=${encodeURIComponent(
              form.user_name
            )}`
          );
          setUsernameStatus(
            res.data.available ? "" : "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว"
          );
        } catch {
          setUsernameStatus("ไม่สามารถตรวจสอบชื่อผู้ใช้ได้");
        }
      } else {
        setUsernameStatus("");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.user_name]);

  const handleAdd = async () => {
    const token = localStorage.getItem("token");
    const { user_name, user_email, user_pass, user_fname, user_lname, user_phone, user_img } = form;

    if (!user_name || !user_email || !user_pass) {
      Swal.fire({
        title: "กรอกข้อมูลไม่ครบ",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_name", user_name);
      formData.append("user_email", user_email);
      formData.append("user_pass", user_pass);
      formData.append("user_fname", user_fname);
      formData.append("user_lname", user_lname);
      formData.append("user_phone", user_phone);
      if (user_img) {
        formData.append("user_img", user_img);
      }

      await axios.post(`${config.apiUrl}/add_user`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      Swal.fire({
        title: "เพิ่มผู้ใช้สำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setOpen(false);
      setForm({
        user_name: "",
        user_email: "",
        user_pass: "",
        user_fname: "",
        user_lname: "",
        user_phone: "",
        user_img: null,
      });
      onRefresh();
    } catch (err: unknown) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด" + err,
        text: "ไม่สามารถเพิ่มผู้ใช้ได้",
        icon: "error",
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ ถ้ามี children (เช่นปุ่มจากหน้า page) ให้ใช้ children เป็นตัวกดเปิด */}
      {children ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer">
          {children}
        </span>
      ) : (
        /* ถ้าไม่มี children ให้แสดงปุ่ม default */
        <Button
          onClick={() => setOpen(true)}
          className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
        >
          เพิ่มผู้ใช้
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setForm({
              user_name: "",
              user_email: "",
              user_pass: "",
              user_fname: "",
              user_lname: "",
              user_phone: "",
              user_img: null,
            });
            setUsernameStatus("");
          }
        }}
      >
        <DialogContent
          className="max-w-md rounded-2xl shadow-2xl bg-white !bg-opacity-100"
          style={{ backdropFilter: "none" }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-blue-700">
                เพิ่มผู้ใช้ใหม่
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdd();
              }}
            >
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="user_name" className="mb-2 block">
                    ชื่อผู้ใช้ (Username)
                  </Label>
                  <Input
                    id="user_name"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    value={form.user_name}
                    onChange={(e) =>
                      setForm({ ...form, user_name: e.target.value })
                    }
                    placeholder="เช่น admin123"
                  />
                  {usernameStatus && (
                    <p className="text-sm text-red-500 mt-1">
                      {usernameStatus}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="user_pass" className="mb-2 block">
                    รหัสผ่าน
                  </Label>
                  <Input
                    id="user_pass"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    type="password"
                    value={form.user_pass}
                    onChange={(e) =>
                      setForm({ ...form, user_pass: e.target.value })
                    }
                    placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  />
                </div>

                <div>
                  <Label htmlFor="user_fname" className="mb-2 block">
                    ชื่อจริง
                  </Label>
                  <Input
                    id="user_fname"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    value={form.user_fname}
                    onChange={(e) =>
                      setForm({ ...form, user_fname: e.target.value })
                    }
                    placeholder="เช่น สมชาย"
                  />
                </div>

                <div>
                  <Label htmlFor="user_lname" className="mb-2 block">
                    นามสกุล
                  </Label>
                  <Input
                    id="user_lname"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    value={form.user_lname}
                    onChange={(e) =>
                      setForm({ ...form, user_lname: e.target.value })
                    }
                    placeholder="เช่น ใจดี"
                  />
                </div>

                <div>
                  <Label htmlFor="user_phone" className="mb-2 block">
                    เบอร์โทรศัพท์
                  </Label>
                  <Input
                    id="user_phone"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    type="tel"
                    maxLength={10}
                    value={form.user_phone}
                    onChange={(e) =>
                      setForm({ ...form, user_phone: e.target.value })
                    }
                    placeholder="เช่น 0812345678"
                  />
                </div>

                <div>
                  <Label htmlFor="user_email" className="mb-2 block">
                    อีเมล
                  </Label>
                  <Input
                    id="user_email"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    type="email"
                    value={form.user_email}
                    onChange={(e) =>
                      setForm({ ...form, user_email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="user_img" className="mb-2 block">
                    รูปโปรไฟล์ (เลือกจากเครื่อง)
                  </Label>
                  <Input
                    id="user_img"
                    className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setForm({ ...form, user_img: file });
                      }
                    }}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-3">
                <Button
                  className="cursor-pointer"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      user_name: "",
                      user_email: "",
                      user_pass: "",
                      user_fname: "",
                      user_lname: "",
                      user_phone: "",
                      user_img: null,
                    });
                    setOpen(false);
                  }}
                  disabled={loading}
                >
                  ยกเลิก
                </Button>

                <Button
                  type="submit"
                  disabled={loading || !!usernameStatus}
                  className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </DialogFooter>
            </form>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}