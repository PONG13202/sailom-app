"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { config } from "../config";
import Swal from "sweetalert2";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("backoffice/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (username.trim()) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_username?user_name=${encodeURIComponent(
              username
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
  }, [username]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (email.trim()) {
        try {
          const res = await axios.get(
            `${config.apiUrl}/check_email?user_email=${encodeURIComponent(
              email
            )}`
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
  }, [email]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // สำคัญ! ป้องกันการ reload หน้า

    setFormError("");

    if (!username || !password || !fname || !lname || !email) {
      setFormError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    if (password.length < 6) {
      setFormError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (usernameStatus || emailStatus) {
      setFormError("กรุณาแก้ไขข้อมูลที่ไม่ถูกต้องก่อนลงทะเบียน");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        user_name: username,
        user_pass: password,
        user_fname: fname,
        user_lname: lname,
        user_email: email,
        user_phone: phone,
      };
      const response = await axios.post(`${config.apiUrl}/register`, payload);
      if (response.status === 200 || response.status === 201) {
        await Swal.fire({
          title: "ลงทะเบียนสำเร็จ",
          text: "ยินดีต้อนรับ! คุณจะถูกนำไปยังหน้าแรก",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        router.push("/");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "ไม่สามารถลงทะเบียนได้";
      setFormError(message);

      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-prompt">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-blue-600">
          ลงทะเบียน
        </h1>
        <p className="text-center text-gray-600">
          กรุณากรอกข้อมูลเพื่อสร้างบัญชีใหม่
        </p>

        <form className="space-y-4" onSubmit={handleRegister}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <Input
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="ชื่อผู้ใช้"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {usernameStatus && (
              <p className="text-sm text-red-500 mt-1">{usernameStatus}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                if (value.length < 6) {
                  setPasswordError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
                } else {
                  setPasswordError("");
                }
              }}
              required
            />
            {passwordError && (
              <p className="text-sm text-red-500 mt-1">{passwordError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <Input
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="ชื่อจริง"
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <Input
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="นามสกุล"
              value={lname}
              onChange={(e) => setLname(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailStatus && (
              <p className="text-sm text-red-500 mt-1">{emailStatus}</p>
            )}
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tell
            </label>
            <Input
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              type="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="เบอร์โทรศัพท์"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          <Button
            className="w-full text-white bg-blue-500 hover:bg-blue-600"
            type="submit"
            disabled={
              isLoading ||
              !username ||
              !password ||
              !fname ||
              !lname ||
              !email ||
              !!usernameStatus ||
              !!emailStatus
            }
          >
            {isLoading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
