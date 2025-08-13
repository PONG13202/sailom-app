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
import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "../../config";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function DeleteUserModal({
  userId,
  user_fname,
  user_lname,
  onRefresh,
  disabled = false, // ✅ รองรับปุ่มถูกปิดสิทธิ์
}: {
  userId: number;
  user_fname: string;
  user_lname: string;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      Swal.fire({
        title: "ผิดพลาด",
        text: "กรุณากรอกรหัสผ่านเพื่อยืนยัน",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${config.apiUrl}/delete_user/${userId}`, {
        data: { password },
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        title: "สำเร็จ",
        text: `ลบผู้ใช้ ${user_fname} ${user_lname} เรียบร้อยแล้ว`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setOpen(false);
      setPassword("");
      onRefresh();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || "เกิดข้อผิดพลาดในการลบผู้ใช้";
      Swal.fire({
        title: "ผิดพลาด",
        text: `${errorMessage} ไม่สามารถลบ ${user_fname} ${user_lname} ได้`,
        icon: "error",
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ปุ่มทริกเกอร์: โทนแดง + disabled สวย ๆ */}
      <Button
        type="button"
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        className={`cursor-pointer font-medium rounded-lg px-4 py-2 transition-all duration-200
          ${disabled
            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-700 text-white hover:shadow-md"
          }`}
      >
        ลบ
      </Button>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setPassword("");
        }}
      >
        <DialogContent className="max-w-md bg-white border border-red-100 shadow-2xl rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-red-700">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </motion.div>
              ยืนยันการลบ
            </DialogTitle>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-gray-600"
          >
            <p className="text-sm leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้{" "}
              <span className="font-semibold">
                {user_fname} {user_lname}
              </span>{" "}
              นี้? <br />
              <span className="text-red-600 font-medium">
                การกระทำนี้ไม่สามารถย้อนกลับได้
              </span>
            </p>

            <div className="mt-4">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                กรุณากรอกรหัสผ่านเพื่อยืนยัน
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password.trim() !== "" && !isLoading) {
                    handleDelete();
                  }
                }}
                className="mt-1 border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-lg"
                placeholder="รหัสผ่าน"
              />
            </div>
          </motion.div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 rounded-lg"
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg px-4 py-2 transition-all duration-200 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading || password.trim() === ""}
            >
              {isLoading ? "กำลังลบ..." : "ลบเลย!"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
