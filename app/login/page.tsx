"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { config } from "../config";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    user_name: "",
    user_pass: "",
  });
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000; // แปลงเป็น milliseconds
    return Date.now() > expiry;
  } catch {
    return true; // ถ้า decode ไม่ได้ แสดงว่า token ไม่ถูกต้องหรือหมดอายุ
  }
};

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !isTokenExpired(token)) {
      router.replace("/backoffice/dashboard");
    } else {
      localStorage.removeItem("token"); // สำคัญ! เคลียร์ token ที่หมดอายุ
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${config.apiUrl}/login`, form);
      if (res.status === 200) {
        const { token } = res.data;
        localStorage.setItem("token", token);
        await Swal.fire({
          icon: "success",
          title: "เข้าสู่ระบบสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
        router.push("/backoffice/dashboard");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        showConfirmButton: false,
        timer: 2000,
        text: err.response?.data?.message || "เกิดข้อผิดพลาด",
      });
    }
  };

  const handleGoogleLoginSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    try {
      if (credentialResponse.credential) {
        const token = credentialResponse.credential;
        const res = await axios.post(`${config.apiUrl}/google_login`, {
          token,
        });

        if (res.status === 200) {
          localStorage.setItem("token", res.data.token);
          await Swal.fire({
            icon: "success",
            title: "เข้าสู่ระบบด้วย Google สำเร็จ",
            showConfirmButton: false,
            timer: 1500,
          });
          router.push("/backoffice/dashboard");
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบด้วย Google ล้มเหลว",
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 font-prompt">
      <Card className="w-full max-w-md shadow-lg border border-blue-200">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-semibold text-blue-800">
            เข้าสู่ระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username or Email
              </label>
              <Input
                type="text"
                name="user_name"
                onChange={handleChange}
                placeholder="ชื่อผู้ใช้"
                required
                className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                type="password"
                name="user_pass"
                onChange={handleChange}
                placeholder="รหัสผ่าน"
                required
                className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              เข้าสู่ระบบ
            </Button>
          </form>

          <div className="my-4 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() =>
                Swal.fire({ icon: "error", title: "Google Login ล้มเหลว" })
              }
            />
          </div>

          <p className="text-center text-sm text-gray-600">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="text-blue-600 hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
