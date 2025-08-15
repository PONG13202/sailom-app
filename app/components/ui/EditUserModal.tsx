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
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "../../config";
import { ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type UserType = {
  user_id: number;
  user_name?: string | null;
  user_fname?: string | null;
  user_lname?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
};

export function EditUserModal({
  user,
  onRefresh,
  disabled = false,
}: {
  user: UserType;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [actorPassword, setActorPassword] = useState("");
  const [user_name, setUser_name] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [user_email, setUser_email] = useState("");
  const [user_phone, setUser_phone] = useState("");
  const [user_img, setUser_img] = useState<File | null>(null);
  const [new_pass, setNew_pass] = useState("");
  const [confirm_pass, setConfirm_pass] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false); // เพิ่ม loading เพื่อ UX ดีขึ้น

const authHeader = useCallback(() => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}, []);

  useEffect(() => {
    if (!user) return;
    setUser_name(user.user_name || "");
    setFname(user.user_fname || "");
    setLname(user.user_lname || "");
    setUser_email(user.user_email || "");
    setUser_phone(user.user_phone || "");
    setUser_img(null);
    setNew_pass("");
    setConfirm_pass("");
  }, [user]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (user_name.trim() && user_name !== (user?.user_name || "")) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_username?user_name=${encodeURIComponent(user_name)}`
          );
          setUsernameStatus(res.data?.available ? "" : "ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว");
        } catch {
          setUsernameStatus("ไม่สามารถตรวจสอบชื่อผู้ใช้ได้");
        }
      } else {
        setUsernameStatus("");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [user_name, user?.user_name]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (user_email.trim() && user_email !== (user?.user_email || "")) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_email?user_email=${encodeURIComponent(user_email)}`
          );
          setEmailStatus(res.data?.available ? "" : "อีเมลนี้ถูกใช้ไปแล้ว");
        } catch {
          setEmailStatus("ไม่สามารถตรวจสอบอีเมลได้");
        }
      } else {
        setEmailStatus("");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [user_email, user?.user_email]);

  const openWithAuth = async () => {
    if (disabled) return;
    setActorPassword("");
    setAuthOpen(true);
  };

  const handleAuthConfirm = async () => {
    if (!actorPassword || actorPassword.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "รหัสผ่านไม่ถูกต้อง",
        text: "กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัว",
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }

    setIsLoading(true);
    try {
      // เรียก backend เพื่อ verify รหัสผ่านจริง ๆ ก่อนเปิด form (assume endpoint /verify_password)
      await axios.post(
        `${config.apiUrl}/verify_password`,
        { password: actorPassword },
        { headers: authHeader() }
      );
      setAuthOpen(false);
      setFormOpen(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || "รหัสผ่านไม่ถูกต้อง";
      Swal.fire({
        icon: "error",
        title: "ยืนยันตัวตนล้มเหลว",
        text: message,
        timer: 2000,
        showConfirmButton: false,
      });
      setActorPassword(""); // clear ถ้าผิดเพื่อ security
    } finally {
      setIsLoading(false);
    }
  };

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
    if (new_pass || confirm_pass) {
      if (!new_pass || new_pass.length < 6) {
        Swal.fire({
          icon: "warning",
          title: "รหัสผ่านใหม่สั้นเกินไป",
          text: "กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัว",
          timer: 1800,
          showConfirmButton: false,
        });
        return;
      }
      if (new_pass !== confirm_pass) {
        Swal.fire({
          icon: "warning",
          title: "ยืนยันรหัสผ่านไม่ตรงกัน",
          text: "กรุณาพิมพ์ยืนยันรหัสผ่านให้ตรงกัน",
          timer: 1800,
          showConfirmButton: false,
        });
        return;
      }
    }
    if (!actorPassword) {
      setFormOpen(false);
      setAuthOpen(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("user_name", user_name);
      formData.append("user_fname", fname);
      formData.append("user_lname", lname);
      formData.append("user_email", user_email);
      formData.append("user_phone", user_phone);
      if (user_img) formData.append("user_img", user_img);
      if (new_pass) formData.append("user_pass", new_pass);
      formData.append("actor_password", actorPassword); // ยังส่งไป re-verify ที่ backend

      await axios.put(`${config.apiUrl}/update_user/${user.user_id}`, formData, {
        headers: authHeader(),
      });

      await Swal.fire({
        icon: "success",
        title: "แก้ไขข้อมูลสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });

      setFormOpen(false);
      setActorPassword("");
      onRefresh();
    } catch (err: any) {
      const message = err?.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้";
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
        type="button"
        aria-disabled={disabled}
        onClick={openWithAuth}
        className={`cursor-pointer font-medium rounded-lg px-3 py-1.5 transition-all
          ${
            disabled
              ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
              : "bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 hover:shadow-sm"
          }`}
      >
        แก้ไข
      </Button>

      <Dialog
        open={authOpen}
        onOpenChange={(isOpen) => {
          setAuthOpen(isOpen);
          if (!isOpen) setActorPassword("");
        }}
      >
        <DialogContent className="max-w-md bg-white border border-blue-100 shadow-2xl rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-blue-700">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </motion.div>
              ยืนยันตัวตนก่อนแก้ไข
            </DialogTitle>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 text-gray-600"
          >
            <p className="text-sm">
              กรุณากรอกรหัสผ่านของคุณเพื่อเข้าสู่หน้าฟอร์มแก้ไขข้อมูลผู้ใช้
            </p>

            <div className="mt-4">
              <Label htmlFor="actor-pwd" className="text-sm font-medium text-gray-700">
                รหัสผ่านของคุณ
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="actor-pwd"
                  type="password"
                  value={actorPassword}
                  onChange={(e) => setActorPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // แก้บัค Enter โดย block event
                      handleAuthConfirm();
                    }
                  }}
                  className="pl-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  placeholder="รหัสผ่านผู้ทำรายการ"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ระบบจะตรวจสอบสิทธิ์อีกครั้งเมื่อคุณกดบันทึก
              </p>
            </div>
          </motion.div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuthOpen(false)}
              className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleAuthConfirm}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2"
              disabled={isLoading}
            >
              {isLoading ? "กำลังตรวจสอบ..." : "ยืนยันและแก้ไข"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={formOpen}
        onOpenChange={(isOpen) => {
          setFormOpen(isOpen);
          if (!isOpen) {
            setActorPassword("");
            setNew_pass("");
            setConfirm_pass("");
            setUser_img(null);
          }
        }}
      >
        <AnimatePresence>
          {formOpen && (
            <DialogContent className="sm:max-w-[640px] bg-white rounded-2xl shadow-2xl">
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
                      <Label className="text-sm text-gray-600 mb-1">ชื่อผู้ใช้</Label>
                      <Input
                        value={user_name}
                        onChange={(e) => setUser_name(e.target.value)}
                      />
                      {usernameStatus && (
                        <p className="text-sm text-red-500 mt-1">{usernameStatus}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600 mb-1">รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)</Label>
                        <Input
                          type="password"
                          value={new_pass}
                          onChange={(e) => setNew_pass(e.target.value)}
                          placeholder="ปล่อยว่างหากไม่เปลี่ยน"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600 mb-1">ยืนยันรหัสผ่านใหม่</Label>
                        <Input
                          type="password"
                          value={confirm_pass}
                          onChange={(e) => setConfirm_pass(e.target.value)}
                          placeholder="พิมพ์ซ้ำให้ตรงกัน"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600 mb-1">ชื่อจริง</Label>
                        <Input value={fname} onChange={(e) => setFname(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600 mb-1">นามสกุล</Label>
                        <Input value={lname} onChange={(e) => setLname(e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600 mb-1">อีเมล</Label>
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
                      <Label className="text-sm text-gray-600 mb-1">เบอร์โทร</Label>
                      <Input
                        value={user_phone}
                        onChange={(e) => setUser_phone(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600 mb-1">รูปโปรไฟล์ (เลือกจากเครื่อง)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setUser_img(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>

                  <DialogFooter className="mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormOpen(false)}
                      className="cursor-pointer"
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