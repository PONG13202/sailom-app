"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { config } from "../../config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { PlusCircle, PencilIcon, TrashIcon, Loader2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../components/ui/Datable";

type Slide = {
  slide_id: number;
  slide_name: string;
  slide_img: string;
  slide_status: number;
  createdAt: string;
  updatedAt: string;
};

export default function SlidePage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<Partial<Slide>>({
    slide_name: "",
    slide_status: 1,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const toImgSrc = (p?: string | null) => {
    if (!p) return "";
    if (
      p.startsWith("blob:") ||
      p.startsWith("data:") ||
      /^https?:\/\//.test(p)
    )
      return p;
    const base = config.apiUrl.replace(/\/+$/, ""); // ex. http://localhost:5000
    const rel = p.startsWith("/") ? p : `/${p}`; // ex. /uploads/slide_images/xxx.png
    return encodeURI(`${base}${rel}`);
  };

  const fetchSlides = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await axios.get<Slide[]>(`${config.apiUrl}/slides`);
      if (response.status === 200 && Array.isArray(response.data)) {
        setSlides(response.data);
      }
    } catch (err: unknown) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "ไม่สามารถดึงข้อมูลสไลด์ได้";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage,
        showConfirmButton: false,
        timer: 1500,
      });
      setFetchError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentSlide({ slide_name: "", slide_status: 1 });
    setImageFile(null);
    setPreview(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (slide: Slide) => {
    setIsEditing(true);
    setCurrentSlide(slide);
    setImageFile(null);
    setPreview(slide.slide_img);
    setOpenModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSlide.slide_name?.trim()) {
      Swal.fire("ผิดพลาด", "กรุณากรอกชื่อสไลด์", "error");
      return;
    }
    if (!isEditing && !imageFile) {
      Swal.fire("ผิดพลาด", "กรุณาอัปโหลดภาพสไลด์", "error");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", currentSlide.slide_name!);
      formData.append("status", currentSlide.slide_status!.toString());
      if (imageFile) formData.append("image", imageFile);

      let response;
      if (isEditing) {
        response = await axios.put(
          `${config.apiUrl}/update_slide/${currentSlide.slide_id}`,
          formData
        );
      } else {
        response = await axios.post(`${config.apiUrl}/add_slide`, formData);
      }

      if (response.status === 200 || response.status === 201) {
        Swal.fire({
          title: isEditing ? "อัปเดตสไลด์สำเร็จ" : "เพิ่มสไลด์สำเร็จ",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        setOpenModal(false);
        fetchSlides();
      }
    } catch (error: unknown) {
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage,
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบสไลด์นี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#d33",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoading(true);
        try {
          const response = await axios.delete(
            `${config.apiUrl}/delete_slide/${id}`
          );
          if (response.status === 200 || response.status === 204) {
            Swal.fire({
              title: "ลบสไลด์สำเร็จ",
              icon: "success",
              timer: 1000,
              showConfirmButton: false,
            });
            fetchSlides();
          }
        } catch (error: unknown) {
          const errorMessage =
            axios.isAxiosError(error) && error.response?.data?.message
              ? error.response.data.message
              : "ไม่สามารถลบสไลด์ได้";
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: errorMessage,
            showConfirmButton: false,
            timer: 1500,
          });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const columns: ColumnDef<Slide>[] = [
    {
      id: "slide_id",
      accessorKey: "slide_id",
      header: () => (
        <div className="text-center font-semibold text-gray-700">ID</div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-800">
          {row.original.slide_id}
        </div>
      ),
      enableSorting: true,
      meta: { headerLabel: "รหัส" },
    },
    {
      accessorKey: "slide_name",
      header: () => (
        <div className="text-left font-semibold text-gray-700">ชื่อสไลด์</div>
      ),
      cell: ({ row }) => (
        <span className="text-gray-800">{row.original.slide_name}</span>
      ),
      meta: { headerLabel: "ชื่อสไลด์" },
    },
    {
      accessorKey: "slide_img",
      header: () => (
        <div className="text-center font-semibold text-gray-700">ภาพ</div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Image
            src={`${config.apiUrl}${row.original.slide_img}`} // e.g. http://localhost:5000/uploads/...
            alt={row.original.slide_name}
            width={100}
            height={60}
            unoptimized
            className="rounded object-cover ring-1 ring-sky-200"
          />
        </div>
      ),
      enableSorting: false,
      meta: { excludeFromSearch: true },
    },
    {
      accessorKey: "slide_status",
      header: () => (
        <div className="text-center font-semibold text-gray-700">สถานะ</div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.slide_status === 1 ? "Active" : "Inactive"}
        </div>
      ),
      enableSorting: true,
      meta: { headerLabel: "สถานะ" },
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <div className="text-center font-semibold text-gray-700">
          สร้างเมื่อ
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ),
      enableSorting: true,
      meta: { headerLabel: "สร้างเมื่อ" },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center font-semibold text-gray-700">จัดการ</div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleOpenEdit(item)}
              className="text-sky-700 hover:bg-sky-50 hover:text-sky-800 transition-colors"
              disabled={isLoading}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(item.slide_id)}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
              disabled={isLoading}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
      meta: { excludeFromSearch: true },
    },
  ];

  if (isLoading && slides.length === 0 && !fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6 bg-gradient-to-b from-sky-50 to-white">
        <Loader2 className="h-20 w-20 text-sky-600 animate-spin mb-6" />
        <p className="text-xl text-gray-700 font-semibold">
          กำลังโหลดข้อมูลสไลด์...
        </p>
        <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-200 pb-3">
          จัดการสไลด์
        </h1>

        {fetchError && (
          <div
            className="p-4 my-4 text-sm text-red-800 bg-red-50 rounded-lg border-2 border-red-200 shadow-sm"
            role="alert"
          >
            <div className="flex items-center">
              <strong className="font-bold mr-2 text-red-700">
                เกิดข้อผิดพลาด:
              </strong>
              <span className="text-red-600">{fetchError}</span>
            </div>
            <Button
              onClick={fetchSlides}
              className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors shadow-md"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            เพิ่มสไลด์ใหม่
          </h2>
          <Button
            onClick={handleOpenAdd}
            className="bg-sky-600 text-white hover:bg-sky-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <PlusCircle className="h-4 w-4 mr-1" />
            เพิ่ม
          </Button>
        </div>

        {/* Modal */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent
            className="
              sm:max-w-lg
              bg-gradient-to-b from-white to-sky-50
              border border-sky-200
              shadow-xl shadow-sky-100
              ring-1 ring-sky-100
              backdrop-blur-md
            "
          >
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {isEditing ? "แก้ไขสไลด์" : "เพิ่มสไลด์ใหม่"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ชื่อสไลด์ */}
              <div>
                <Label htmlFor="slide_name" className="text-slate-700">
                  ชื่อสไลด์
                </Label>
                <Input
                  id="slide_name"
                  value={currentSlide.slide_name || ""}
                  onChange={(e) =>
                    setCurrentSlide({
                      ...currentSlide,
                      slide_name: e.target.value,
                    })
                  }
                  placeholder="กรอกชื่อสไลด์..."
                  className="border-sky-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  disabled={isLoading}
                />
              </div>

              {/* อัปโหลดภาพ + preview */}
              <div>
                <Label htmlFor="slide_img" className="text-slate-700">
                  อัปโหลดภาพ
                </Label>

                {/* input จริง: ซ่อน */}
                <input
                  id="slide_img"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setPreview(URL.createObjectURL(file));
                    }
                  }}
                  disabled={isLoading}
                />

                {/* แถวปุ่ม + ชื่อไฟล์ */}
                <div className="mt-2 flex items-center gap-3 rounded-md border border-sky-200 bg-white/70 p-2 min-w-0">
                  <Button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="bg-sky-600 text-white hover:bg-sky-700"
                    disabled={isLoading}
                  >
                    เลือกไฟล์
                  </Button>
                  <span className="flex-1 min-w-0 text-sm text-slate-600 truncate">
                    {imageFile?.name ||
                      (isEditing
                        ? "ใช้รูปเดิม หรือเลือกใหม่"
                        : "ยังไม่ได้เลือกไฟล์")}
                  </span>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="mt-3 relative w-full max-w-sm aspect-[16/9] rounded ring-1 ring-sky-200 overflow-hidden bg-white">
                    <Image
                      src={toImgSrc(preview)}
                      alt="Preview"
                      fill
                      unoptimized
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw, 512px"
                    />
                  </div>
                )}
              </div>

              {/* สถานะ */}
              <div className="flex items-center justify-between rounded-md border border-sky-200 bg-white/70 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="slide_status" className="text-slate-700">
                    สถานะ
                  </Label>
                  <p className="text-xs text-slate-500">
                    เปิด/ปิดการแสดงผลของสไลด์
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">
                    {currentSlide.slide_status === 1 ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    id="slide_status"
                    checked={currentSlide.slide_status === 1}
                    onCheckedChange={(checked) =>
                      setCurrentSlide({
                        ...currentSlide,
                        slide_status: checked ? 1 : 0,
                      })
                    }
                    className="data-[state=checked]:bg-sky-600"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* ปุ่มบันทึก */}
              <Button
                type="submit"
                className="w-full bg-sky-600 text-white hover:bg-sky-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "อัปเดต" : "เพิ่ม"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* DataTable (คงเดิม) */}
        <div className="overflow-hidden mt-6 p-6">
          <DataTable
            columns={columns}
            data={slides}
            searchPlaceholder="ค้นหาสไลด์..."
            defaultSortColumnId="slide_id"
            noDataMessage={
              fetchError
                ? "ไม่สามารถโหลดข้อมูลได้ โปรดลองอีกครั้ง"
                : "ยังไม่มีสไลด์ในระบบ"
            }
          />
        </div>
      </div>
    </div>
  );
}
