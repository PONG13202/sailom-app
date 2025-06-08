"use client";
// sailom\app\components\ui\LoginModal.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Swal from "sweetalert2";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: string[];
  profileForm: {
    user_name: string;
    user_pass: string;
    user_fname: string;
    user_lname: string;
    user_email: string;
    user_phone: string;
  };
  onProfileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function ProfileCompletionModal({
  open,
  onOpenChange,
  missingFields,
  profileForm,
  onProfileChange,
  onProfileSubmit,
}: LoginModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Array.isArray(missingFields) && missingFields.includes("user_pass")) {
      // ตรวจสอบความยาวรหัสผ่าน
      if (!profileForm.user_pass || profileForm.user_pass.length < 6) {
        await Swal.fire({
          icon: "error",
          title: "รหัสผ่านไม่ถูกต้อง",
          text: "กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร",
          showConfirmButton: false,
          timer: 1500,
        });
        return; // หยุดไม่ให้ submit ต่อ
      }
    }
    if (
      Array.isArray(missingFields) &&
      missingFields.includes("user_phone") &&
      !/^0[0-9]{9}$/.test(profileForm.user_phone)
    ) {
      await Swal.fire({
        icon: "error",
        title: "เบอร์โทรศัพท์ไม่ถูกต้อง",
        text: "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (เช่น 0812345678)",
        showConfirmButton: true,
      });
      return;
    }
    await onProfileSubmit(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white shadow-lg rounded-xl">
        <DialogHeader>
          <DialogTitle>กรอกข้อมูลโปรไฟล์</DialogTitle>
          <DialogDescription>
            กรุณากรอกข้อมูลที่จำเป็นเพื่อดำเนินการต่อ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ชื่อผู้ใช้
            </label>
            <Input
              type="text"
              name="user_name"
              value={profileForm.user_name || ""}
              onChange={onProfileChange}
              placeholder="ชื่อผู้ใช้"
              required
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              รหัสผ่าน
            </label>
            <Input
              type="password"
              name="user_pass"
              value={profileForm.user_pass || ""}
              onChange={onProfileChange}
              placeholder="รหัสผ่าน"
              required
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              ชื่อจริง
            </label>
            <Input
              type="text"
              name="user_fname"
              value={profileForm.user_fname || ""}
              onChange={onProfileChange}
              placeholder="ชื่อจริง"
              required
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              นามสกุล
            </label>
            <Input
              type="text"
              name="user_lname"
              value={profileForm.user_lname || ""}
              onChange={onProfileChange}
              placeholder="นามสกุล"
              required
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              อีเมล
            </label>
            <Input
              type="email"
              name="user_email"
              value={profileForm.user_email || ""}
              onChange={onProfileChange}
              placeholder="อีเมล"
              required
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              เบอร์โทรศัพท์
            </label>
            <Input
              type="text"
              name="user_phone"
              value={profileForm.user_phone || ""}
              onChange={onProfileChange}
              placeholder="เบอร์โทรศัพท์"
              required
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            บันทึกข้อมูล
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
