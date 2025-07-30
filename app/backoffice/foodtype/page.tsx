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
  Loader2, // เพิ่ม Loader2 icon สำหรับ loading state
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
      const response = await axios.get<FoodType[]>(
        `${config.apiUrl}/foodTypes`
      );
      if (response.status === 200 && Array.isArray(response.data)) {
        setFoodTypes(response.data);
      }
    } catch (err: unknown) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "ไม่สามารถดึงข้อมูลประเภทอาหารได้";
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
      const response = await axios.put(
        `${config.apiUrl}/update_FoodType/${id}`,
        { name: editValue }
      );
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
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "ไม่สามารถแก้ไขประเภทอาหารได้";
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

  // ฟังก์ชันสำหรับเพิ่มประเภทอาหาร
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) {
      Swal.fire("ผิดพลาด", "กรุณากรอกชื่อประเภทอาหาร", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post<FoodType>(
        `${config.apiUrl}/add_FoodType`,
        {
          name: newType,
        }
      );
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
      const errorMessage =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มประเภทอาหารได้\n" + errorMessage,
        showConfirmButton: false,
        timer: 1500,
      });
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
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoading(true);
        try {
          const response = await axios.delete(
            `${config.apiUrl}/delete_FoodType/${id}`
          );
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
          const errorMessage =
            axios.isAxiosError(error) && error.response?.data?.message
              ? error.response.data.message
              : "ไม่สามารถลบประเภทอาหารได้";
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

  // ป้องกัน rerender ไม่จำเป็นสำหรับ Input ในโหมดแก้ไข
  const handleEditChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditValue(e.target.value);
    },
    []
  );

  const columns: ColumnDef<FoodType>[] = [
    {
      id: "id",
      accessorKey: "id",
      header: () => (
        <div className="text-center font-semibold text-gray-700">ID</div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium text-gray-800">
          {row.original.id}
        </div>
      ),
      enableSorting: true,
      meta: { headerLabel: "รหัส" },
    },
    {
      accessorKey: "name",
      header: () => (
        <div className="text-left font-semibold text-gray-700">
          ชื่อประเภทอาหาร
        </div>
      ),
      cell: ({ row }) =>
        editingId === row.original.id ? (
          <Input
            ref={editInputRef} // ใช้ ref เพื่อรักษาโฟกัส
            value={editValue}
            onChange={handleEditChange} // ใช้ callback ที่ memoized
            className="w-full border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            autoFocus // เพิ่ม autoFocus เพื่อให้โฟกัสทันที
          />
        ) : (
          <span className="text-gray-800">{row.original.name}</span>
        ),
      meta: { headerLabel: "ชื่อประเภท" },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center font-semibold text-gray-700">จัดการ</div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return editingId === item.id ? (
          <div className="flex gap-2 justify-center">
            {/* ปุ่มยืนยันการแก้ไข */}
            <Button
              size="sm"
              variant="ghost" // ใช้ variant="ghost" เพื่อความเรียบง่าย
              onClick={() => handleUpdate(item.id)}
              className="text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
            {/* ปุ่มยกเลิกการแก้ไข */}
            <Button
              size="sm"
              variant="ghost" // ใช้ variant="ghost"
              onClick={() => setEditingId(null)}
              className="text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center">
            {/* ปุ่มแก้ไข */}
            <Button
              size="sm"
              variant="ghost" // ใช้ variant="ghost"
              onClick={() => handleEdit(item.id, item.name)}
              className="text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            {/* ปุ่มลบ */}
            <Button
              size="sm"
              variant="ghost" // ใช้ variant="ghost"
              onClick={() => handleDelete(item.id)}
              className="text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6 bg-gradient-to-b from-blue-50 to-white">
        <Loader2 className="h-20 w-20 text-sky-600 animate-spin mb-6" />
        <p className="text-xl text-gray-700 font-semibold">
          กำลังโหลดข้อมูลประเภทอาหาร...
        </p>
        <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-200 pb-3">
          จัดการประเภทอาหาร
        </h1>

        {fetchError && (
          <div
            className="p-4 my-4 text-sm text-red-800 bg-red-50 rounded-lg border-2 border-red-200 shadow-sm animate-fade-in"
            role="alert"
          >
            <div className="flex items-center">
              <strong className="font-bold mr-2 text-red-700">
                เกิดข้อผิดพลาด:
              </strong>
              <span className="text-red-600">{fetchError}</span>
            </div>
            <Button
              onClick={fetchFoodTypes}
              className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors shadow-md"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลองอีกครั้ง
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            เพิ่มประเภทอาหารใหม่
          </h2>
          <form
            onSubmit={handleAddType}
            className="flex gap-2 w-full sm:w-auto"
          >
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="กรอกชื่อประเภทอาหาร..."
              className="flex-grow border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ease-in-out"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <PlusCircle className=" h-4 w-4 mr-1" />
              เพิ่ม
            </Button>
          </form>
        </div>

        {/* DataTable Wrapper with Shadcn styling */}
        <div className=" overflow-hidden mt-6 p-6">
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
    </div>
  );
}
