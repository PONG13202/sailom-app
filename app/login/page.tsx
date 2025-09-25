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
import ProfileCompletionModal from "../components/ui/LoginModal";
import { config } from "../config";

const getUserFromToken = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    user_name: "",
    user_pass: "",
  });

  const [profileForm, setProfileForm] = useState({
    user_name: "",
    user_pass: "",
    user_fname: "",
    user_lname: "",
    user_email: "",
    user_phone: "",
  });
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [openModal, setOpenModal] = useState(false);

  const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiry = payload.exp * 1000;
      return Date.now() > expiry;
    } catch {
      return true;
    }
  };

useEffect(() => {
  const token = localStorage.getItem("token");
  if (token && !isTokenExpired(token)) {
    const user = getUserFromToken(token);
    const ok =
      user?.isAdmin ||
      user?.isStaff ||
      (Array.isArray(user?.roles) && user.roles.some((r: string) => r === "admin" || r === "staff"));
    if (ok) {
      router.replace("/backoffice/dashboard");
      return;
    }
  }
  localStorage.removeItem("token");
}, [router]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await axios.post(`${config.apiUrl}/login`, form);
    if (res.status === 200) {
      const { token } = res.data;
      localStorage.setItem("token", token);

      const user = getUserFromToken(token);
      const ok =
        user?.isAdmin ||
        user?.isStaff ||
        (Array.isArray(user?.roles) && user.roles.some((r: string) => r === "admin" || r === "staff"));

      if (!ok) {
        Swal.fire({
          icon: "error",
          title: "สิทธิ์ไม่พอ",
          text: "เฉพาะผู้ดูแลหรือพนักงานเท่านั้น",
          showConfirmButton: false,
          timer: 2000,
        });
        localStorage.removeItem("token");
        return;
      }

      await Swal.fire({ icon: "success", title: "เข้าสู่ระบบสำเร็จ", showConfirmButton: false, timer: 1500 });
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

      console.log("Google login response:", res.data);

      if (res.status === 200) {
        if (res.data.incompleteProfile) {
          setMissingFields(res.data.missingFields);
          setProfileForm({
            user_name: res.data.user?.user_name ?? "",
            user_pass: "",
            user_fname:
              res.data.user?.user_fname ??
              res.data.googleUser?.first_name ??
              "",
            user_lname:
              res.data.user?.user_lname ??
              res.data.googleUser?.last_name ??
              "",
            user_email:
              res.data.user?.user_email ?? res.data.googleUser?.email ?? "",
            user_phone: res.data.user?.user_phone ?? "",
          });
          setMissingFields([]); // ไม่ได้ใช้จริง แต่ให้คงโครงไว้ได้
          localStorage.setItem("tempToken", res.data.tempToken);
          setOpenModal(true);
        } else {
          localStorage.setItem("token", res.data.token);
          const user = getUserFromToken(res.data.token); // Extract user from token
if (!(user?.isAdmin || user?.isStaff)) {
  Swal.fire({
    icon: "error",
    title: "สิทธิ์ไม่พอ",
    text: "เฉพาะผู้ดูแลหรือพนักงานเท่านั้น",
    showConfirmButton: false,
    timer: 2000,
  });
  localStorage.removeItem("token");
  return;
}

await Swal.fire({
  icon: "success",
  title: "เข้าสู่ระบบด้วย Google สำเร็จ",
  showConfirmButton: false,
  timer: 1500,
});
router.push("/backoffice/dashboard");
        }
      }
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error.response.data.message || "ผู้ใช้ไม่ใช่แอดมิน ไม่สามารถเข้าสู่ระบบได้",
        showConfirmButton: false,
        timer: 2000,
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบด้วย Google ล้มเหลว",
        showConfirmButton: false,
        timer: 2000,
      });
    }
    localStorage.removeItem("tempToken");
    localStorage.removeItem("token");
  }
};


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token =
        localStorage.getItem("tempToken") || localStorage.getItem("token");
      const res = await axios.post(
        `${config.apiUrl}/complete_profile`,
        profileForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.status === 200) {
        localStorage.setItem("token", res.data.token);
        localStorage.removeItem("tempToken");
        await Swal.fire({
          icon: "success",
          title: "เพิ่มข้อมูลสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
        setOpenModal(false);
        router.push("/backoffice/dashboard");
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: res.data.message || "ไม่สามารถบันทึกข้อมูลได้",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        showConfirmButton: false,
        timer: 2000,
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
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
                value={form.user_name}
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
                value={form.user_pass}
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

      <ProfileCompletionModal
        open={openModal}
        onOpenChange={setOpenModal}
        missingFields={missingFields}
        profileForm={profileForm}
        onProfileChange={handleProfileChange}
        onProfileSubmit={handleProfileSubmit}
      />
    </div>
  );
}
