// sailom\app\components\pages\FoodTypePage.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import axios from "axios";
import { config } from "../../config"; // ตรวจสอบ path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  PencilIcon,
  TrashIcon,
  XIcon,
  CheckIcon,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../components/ui/Datable"; // ตรวจสอบ path

type FoodType = {
  id: number;
  name: string;
};

export default function FoodTypePage() {
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [newType, setNewType] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // เพิ่ม useRef เพื่อเก็บ input element และป้องกันการเสียโฟกัส
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // ฟังก์ชันสำหรับดึงข้อมูลประเภทอาหารจาก API
  const fetchFoodTypes = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await axios.get<FoodType[]>(`${config.apiUrl}/foodTypes`);
      if (response.status === 200 && Array.isArray(response.data)) {
        setFoodTypes(response.data);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลประเภทอาหารได้" + err,
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // เรียก fetchData เมื่อ component โหลดครั้งแรก
  useEffect(() => {
    fetchFoodTypes();
  }, [fetchFoodTypes]);

  // ฟังก์ชันสำหรับเริ่มแก้ไขประเภทอาหาร
  const handleEdit = useCallback((id: number, name: string) => {
    setEditingId(id);
    setEditValue(name);
    // ใช้ setTimeout เพื่อให้แน่ใจว่า input ถูกโฟกัสหลังจาก render
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  }, []);

  // ฟังก์ชันสำหรับอัปเดตประเภทอาหาร
  const handleUpdate = async (id: number) => {
    if (!editValue.trim()) {
      Swal.fire("ผิดพลาด", "กรุณากรอกชื่อประเภทอาหาร", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put(`${config.apiUrl}/update_FoodType/${id}`, { name: editValue });
      if (response.status === 200) {
        Swal.fire({
          title: "อัพเดตประเภทอาหารสำเร็จ",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        setEditingId(null);
        setEditValue("");
        fetchFoodTypes();
      }
    } catch (error: unknown) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถแก้ไขประเภทอาหารได้"+ error,
        showConfirmButton: false,
        timer: 1500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันสำหรับเพิ่มประเภทอาหาร
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) {
      Swal.fire("ผิดพลาด", "กรุณากรอกชื่อประเภทอาหาร", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post<FoodType>(`${config.apiUrl}/add_FoodType`, {
        name: newType,
      });
      if (response.status === 201 || response.status === 200) {
        Swal.fire({
          title: "เพิ่มประเภทอาหารสำเร็จ",
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        setNewType("");
        fetchFoodTypes();
      } else {
        Swal.fire("ผิดพลาด", "ไม่สามารถเพิ่มประเภทอาหารได้", "error");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถเพิ่มประเภทอาหารได้\n" + (error.response?.data?.message || error.message),
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันสำหรับลบประเภทอาหาร
  const handleDelete = async (id: number) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบประเภทอาหารนี้หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoading(true);
        try {
          const response = await axios.delete(`${config.apiUrl}/delete_FoodType/${id}`);
          if (response.status === 200 || response.status === 204) {
            Swal.fire({
              title: "ลบประเภทอาหารสำเร็จ",
              icon: "success",
              timer: 1000,
              showConfirmButton: false,
            });
            fetchFoodTypes();
          }
        } catch (error: unknown) {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถลบประเภทอาหารได้" + error,
            showConfirmButton: false,
            timer: 1500,
          });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // ป้องกัน rerender ไม่จำเป็นสำหรับ Input ในโหมดแก้ไข
  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const columns: ColumnDef<FoodType>[] = [
    {
      id: "id",
      accessorKey: "id",
      header: () => <div className="text-center">ID</div>,
      cell: ({ row }) => (
        <div className="text-center font-medium">{row.original.id}</div>
      ),
      enableSorting: true,
      meta: { headerLabel: "รหัส" },
    },
    {
      accessorKey: "name",
      header: "ชื่อประเภทอาหาร",
      cell: ({ row }) =>
        editingId === row.original.id ? (
          <Input
            ref={editInputRef} // ใช้ ref เพื่อรักษาโฟกัส
            value={editValue}
            onChange={handleEditChange} // ใช้ callback ที่ memoized
            className="w-full"
            disabled={isLoading}
            autoFocus // เพิ่ม autoFocus เพื่อให้โฟกัสทันที
          />
        ) : (
          <span className="text-gray-700">{row.original.name}</span>
        ),
      meta: { headerLabel: "ชื่อประเภท" },
    },
    {
      id: "actions",
      header: () => <div className="text-center">จัดการ</div>,
      cell: ({ row }) => {
        const item = row.original;
        return editingId === item.id ? (
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdate(item.id)}
              className="cursor-pointer bg-green-50 text-green-700 hover:bg-green-100 border border-green-300"
              disabled={isLoading}
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingId(null)}
              className="cursor-pointer bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300"
              disabled={isLoading}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(item.id, item.name)}
              className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300"
              disabled={isLoading}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(item.id)}
              className="cursor-pointer bg-red-50 text-red-700 hover:bg-red-100 border border-red-300"
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

  if (isLoading && foodTypes.length === 0 && !fetchError) {
    return (
      <div className="h-full p-6 flex flex-col justify-center items-center min-h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-sky-600 mb-6"></div>
        <p className="text-xl text-gray-700 font-semibold">
          กำลังโหลดข้อมูลประเภทอาหาร...
        </p>
        <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
      </div>
    );
  }

  return (
    <div className="h-full p-6 bg-gradient-to-b from-blue-50 via-white to-white">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 text-center">
        จัดการประเภทอาหาร
      </h1>

      <div className="max-w-4xl mx-auto">
        {fetchError && (
          <div
            className="p-4 my-4 text-sm text-red-800 bg-red-100 rounded-lg border-2 border-red-300 shadow-md"
            role="alert"
          >
            <div className="flex items-center">
              <strong className="font-bold mr-1">เกิดข้อผิดพลาด:</strong>
              <span>{fetchError}</span>
            </div>
            <button
              onClick={fetchFoodTypes}
              className="mt-3 ml-auto block px-4 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end items-center mb-6 gap-y-4">
          <form onSubmit={handleAddType} className="flex gap-2 w-full sm:w-auto">
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="เพิ่มประเภทอาหารใหม่..."
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="cursor-pointer bg-sky-600 text-white hover:bg-sky-800 shadow-md"
              disabled={isLoading}
            >
              <PlusCircle className=" h-4 w-4 mr-1" />
              เพิ่ม
            </Button>
          </form>
        </div>

        <DataTable
          columns={columns}
          data={foodTypes}
          searchPlaceholder="ค้นหาประเภทอาหาร..."
          defaultSortColumnId="id"
          noDataMessage={
            fetchError
              ? "ไม่สามารถโหลดข้อมูลได้ โปรดลองอีกครั้ง"
              : "ยังไม่มีประเภทอาหารในระบบ"
          }
        />
      </div>
    </div>
  );
}