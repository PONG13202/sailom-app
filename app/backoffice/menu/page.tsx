"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Image from "next/image";
import { PlusIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Variants } from "framer-motion";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import FoodCard from "../../components/ui/FoodCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { config } from "../../config";
import { socket } from "@/app/socket"; // 👈 ใช้ socket.io แบบเดียวกับหน้าก่อน

/* ============================ Types ============================ */
interface MenuImage {
  menu_image_id?: number;
  menu_id?: number;
  menu_image: string;
  menu_status: number;
}

interface FoodMenu {
  menu_id: number;
  menu_name: string;
  menu_price: number;
  menu_description?: string | null;
  menu_status: number;
  // ✅ เพิ่มฟิลด์ใหม่
  isLimited?: number;      // 0/1
  stock?: number | null;   // จำนวนคงเหลือ
  MenuImages: MenuImage[];
  Typefoods: { typefood: { id: number; name: string } }[];
}

/* ============================ Animations ============================ */
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const dialogContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

/* ============================ Page ============================ */
export default function FoodsManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All Dishes");
  const [foodTypes, setFoodTypes] = useState<{ id: number; name: string }[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [foods, setFoods] = useState<FoodMenu[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // pagination
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // === รูปภาพ/แก้ไข ===
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number | null>(null);
  const [existingImages, setExistingImages] = useState<MenuImage[]>([]);
  const [mainExistingImageIndex, setMainExistingImageIndex] = useState<number | null>(null);
  const [editingMenu, setEditingMenu] = useState<FoodMenu | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ✅ สถานะฟิลด์ใหม่ (ใช้แยกจาก editingMenu เพื่อไม่ไปกระทบ handler เดิม)
  const [limited, setLimited] = useState<boolean>(false);
  const [stock, setStock] = useState<string>("");

  /* ============================ Data ============================ */
  const fetchFoodTypes = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/foodTypes`);
      if (response.status === 200 && Array.isArray(response.data)) {
        setFoodTypes(response.data);
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถดึงข้อมูลประเภทอาหารได้",
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const fetchFoods = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/menus`);
      if (response.status === 200 && Array.isArray(response.data)) {
        setFoods(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch foods:", err);
    }
  };

  // auth + โหลดเริ่มต้น
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "หมดเวลาการใช้งาน",
        text: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
        showConfirmButton: false,
        timer: 2000,
      });
      localStorage.removeItem("token");
      localStorage.removeItem("tempToken");
      router.replace("/");
      return;
    }
    fetchFoodTypes();
    fetchFoods();
  }, [router]);

  // === Socket.IO realtime ===
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onMenu = (payload: FoodMenu[] | any) => {
      if (Array.isArray(payload)) setFoods(payload as FoodMenu[]);
      else fetchFoods();
    };

    const onFoodType = (payload: any[]) => {
      if (!Array.isArray(payload)) return;
      const normalized = payload
        .map((t) => ({ id: t?.id ?? t?.typefood_id, name: t?.name ?? t?.typefood_name }))
        .filter((t) => typeof t.id === "number" && t.name);
      setFoodTypes(normalized as { id: number; name: string }[]);
    };

    const onMenuAdded = () => fetchFoods();
    const onMenuUpdated = () => fetchFoods();
    const onMenuDeleted = () => fetchFoods();

    socket.on("menu:list", onMenu);
    socket.on("foodType", onFoodType);
    socket.on("menu:created", onMenuAdded);
    socket.on("menu:updated", onMenuUpdated);
    socket.on("menu:deleted", onMenuDeleted);

    return () => {
      socket.off("menu:list", onMenu);
      socket.off("foodType", onFoodType);
      socket.off("menu:created", onMenuAdded);
      socket.off("menu:updated", onMenuUpdated);
      socket.off("menu:deleted", onMenuDeleted);
    };
  }, []);

  /* ============================ Helpers ============================ */
  const resetFormAndState = useCallback(() => {
    if (formRef.current) formRef.current.reset();
    setSelectedTypes([]);
    selectedFiles.forEach((f, i) => URL.revokeObjectURL(imagePreviews[i]));
    setSelectedFiles([]);
    setImagePreviews([]);
    setMainImageIndex(null);
    setExistingImages([]);
    setMainExistingImageIndex(null);
    setEditingMenu(null);
    // ✅ reset ฟิลด์ใหม่
    setLimited(false);
    setStock("");
  }, [imagePreviews, selectedFiles]);

  const toggleTypeSelection = (typeId: number) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      const newPreviewImages: string[] = filesArray.map((file) => URL.createObjectURL(file));
      setImagePreviews(newPreviewImages);
      setMainExistingImageIndex(null);
      setMainImageIndex(filesArray.length === 1 ? 0 : null);
    } else {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setImagePreviews([]);
      setMainImageIndex(null);
    }
  };

  const handleSelectMainImage = (index: number, isNewImage: boolean = true) => {
    if (isNewImage) {
      setMainImageIndex(index);
      setMainExistingImageIndex(null);
    } else {
      setMainExistingImageIndex(index);
      setMainImageIndex(null);
    }
  };

  const handleRemoveExistingImage = (imageIdToRemove: number) => {
    setExistingImages((prevImages) => {
      const updated = prevImages.filter((img) => img.menu_image_id !== imageIdToRemove);
      const removedIndex = prevImages.findIndex((img) => img.menu_image_id === imageIdToRemove);
      if (mainExistingImageIndex !== null && removedIndex === mainExistingImageIndex) {
        setMainExistingImageIndex(null);
      } else if (mainExistingImageIndex !== null && removedIndex < mainExistingImageIndex) {
        setMainExistingImageIndex((p) => (p !== null ? p - 1 : null));
      }
      return updated;
    });
  };

  /* ============================ CRUD ============================ */
  const validateStock = (): boolean => {
    if (!limited) return true;
    if (stock === "") {
      Swal.fire({ icon: "warning", title: "กรุณาระบุจำนวนคงเหลือ", timer: 1500, showConfirmButton: false });
      return false;
    }
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) {
      Swal.fire({ icon: "warning", title: "จำนวนคงเหลือต้องเป็นจำนวนเต็มไม่ติดลบ", timer: 1700, showConfirmButton: false });
      return false;
    }
    return true;
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTypes.length === 0) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกประเภทอาหาร", showConfirmButton: false, timer: 1500 });
      return;
    }
    if (selectedFiles.length === 0) {
      Swal.fire({ icon: "warning", title: "กรุณาอัปโหลดรูปภาพเมนู", showConfirmButton: false, timer: 1500 });
      return;
    }
    if (!validateStock()) return;

    let finalMainImageIndex = mainImageIndex;
    if (selectedFiles.length > 1 && finalMainImageIndex === null) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกรูปภาพหลัก", showConfirmButton: false, timer: 2000 });
      return;
    }
    if (selectedFiles.length === 1 && finalMainImageIndex === null) finalMainImageIndex = 0;

    const formData = new FormData();
    formData.append("menu_name", (e.target as HTMLFormElement).dishName.value);
    formData.append("menu_price", (e.target as HTMLFormElement).price.value);
    formData.append("menu_description", (e.target as HTMLFormElement).description.value);
    formData.append("typefoodIds", JSON.stringify(selectedTypes));
    selectedFiles.forEach((file) => formData.append("images", file));
    if (finalMainImageIndex !== null) formData.append("mainImageIndex", finalMainImageIndex.toString());
    formData.append("menu_status", (editingMenu?.menu_status ?? 1).toString());

    // ✅ แนบฟิลด์ใหม่
    formData.append("isLimited", limited ? "1" : "0");
    formData.append("stock", limited ? String(Math.floor(Number(stock))) : "");

    try {
      await axios.post(`${config.apiUrl}/add_menu`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      Swal.fire({ icon: "success", title: "เพิ่มเมนูสำเร็จ", showConfirmButton: false, timer: 1500 });
      fetchFoods();
      setIsDialogOpen(false);
      resetFormAndState();
    } catch (err: any) {
      console.error("Error adding food:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มเมนูได้: " + (err.response?.data?.message || err.message),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  const handleDeleteFood = async (menuId: number) => {
    Swal.fire({
      title: "แน่ใจหรือไม่?",
      text: "คุณต้องการลบเมนูนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await axios.delete(`${config.apiUrl}/delete_menu/${menuId}`);
        Swal.fire({ icon: "success", title: "ลบเมนูสำเร็จ", showConfirmButton: false, timer: 1500 });
        fetchFoods();
      } catch (err: any) {
        console.error("Error deleting food:", err.response?.data || err.message);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถลบเมนูได้: " + (err.response?.data?.message || err.message),
          showConfirmButton: false,
          timer: 2000,
        });
      }
    });
  };

  const handleEditFood = (menuId: number) => {
    const menuToEdit = foods.find((f) => f.menu_id === menuId);
    if (!menuToEdit) return;
    setEditingMenu(menuToEdit);
    setIsDialogOpen(true);

    setTimeout(() => {
      if (formRef.current) {
        (formRef.current.elements.namedItem("dishName") as HTMLInputElement).value = menuToEdit.menu_name;
        (formRef.current.elements.namedItem("price") as HTMLInputElement).value = menuToEdit.menu_price.toString();
        (formRef.current.elements.namedItem("description") as HTMLTextAreaElement).value = menuToEdit.menu_description || "";
      }
      setSelectedTypes(menuToEdit.Typefoods.map((tf) => tf.typefood.id));
      setExistingImages(menuToEdit.MenuImages);
      const mainImg = menuToEdit.MenuImages.find((img) => img.menu_status === 1);
      setMainExistingImageIndex(mainImg ? menuToEdit.MenuImages.indexOf(mainImg) : null);
      setSelectedFiles([]);
      setImagePreviews([]);
      setMainImageIndex(null);

      // ✅ เติมค่าเดิมของฟิลด์ใหม่
      setLimited((menuToEdit.isLimited ?? 0) === 1);
      setStock(menuToEdit.stock != null ? String(menuToEdit.stock) : "");
    }, 0);
  };

  const handleUpdateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu) {
      Swal.fire({ icon: "error", title: "ไม่พบเมนูที่ต้องการอัปเดต", showConfirmButton: false, timer: 1500 });
      return;
    }
    if (selectedTypes.length === 0) {
      Swal.fire({ icon: "warning", title: "กรุณาเลือกประเภทอาหาร", showConfirmButton: false, timer: 1500 });
      return;
    }
    if (selectedFiles.length === 0 && existingImages.length === 0) {
      Swal.fire({ icon: "warning", title: "กรุณาอัปโหลดรูปภาพเมนู", showConfirmButton: false, timer: 1500 });
      return;
    }
    if (!validateStock()) return;

    let finalMainImageIdentifier: string | number | null = null;
    if (selectedFiles.length > 0) {
      if (selectedFiles.length > 1 && mainImageIndex === null) {
        Swal.fire({ icon: "warning", title: "กรุณาเลือกรูปภาพหลัก (รูปใหม่)", showConfirmButton: false, timer: 2000 });
        return;
      }
      finalMainImageIdentifier = mainImageIndex === null && selectedFiles.length === 1 ? 0 : mainImageIndex;
    } else {
      if (existingImages.length > 1 && mainExistingImageIndex === null) {
        Swal.fire({ icon: "warning", title: "กรุณาเลือกรูปภาพหลัก (รูปเดิม)", showConfirmButton: false, timer: 2000 });
        return;
      }
      finalMainImageIdentifier =
        mainExistingImageIndex === null && existingImages.length === 1
          ? existingImages[0].menu_image
          : existingImages[mainExistingImageIndex as number]?.menu_image || null;
    }

    const formData = new FormData();
    formData.append("menu_name", (e.target as HTMLFormElement).dishName.value);
    formData.append("menu_price", (e.target as HTMLFormElement).price.value);
    formData.append("menu_description", (e.target as HTMLFormElement).description.value);
    formData.append("typefoodIds", JSON.stringify(selectedTypes));
    formData.append("existingImages", JSON.stringify(existingImages));
    selectedFiles.forEach((file) => formData.append("newImages", file));
    formData.append("mainImageIdentifier", finalMainImageIdentifier !== null ? String(finalMainImageIdentifier) : "");
    formData.append("menu_status", (editingMenu?.menu_status ?? 1).toString());

    // ✅ แนบฟิลด์ใหม่
    formData.append("isLimited", limited ? "1" : "0");
    formData.append("stock", limited ? String(Math.floor(Number(stock))) : "");

    try {
      await axios.put(`${config.apiUrl}/update_menu/${editingMenu.menu_id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({ icon: "success", title: "อัปเดตเมนูสำเร็จ", showConfirmButton: false, timer: 1500 });
      fetchFoods();
      setIsDialogOpen(false);
      resetFormAndState();
    } catch (err: any) {
      console.error("Error updating food:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถอัปเดตเมนูได้: " + (err.response?.data?.message || err.message),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  /* ============================ Filters & Pagination ============================ */
  const filteredFoods = useMemo(() => {
    if (activeTab === "All Dishes") return foods;
    return foods.filter((food) =>
      food.Typefoods.some((ft) => ft.typefood.name.toLowerCase() === activeTab.toLowerCase())
    );
  }, [foods, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pageSize, foods.length]);

  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStart = (clampedPage - 1) * pageSize;
  const pageFoods = filteredFoods.slice(pageStart, pageStart + pageSize);

  const changePage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const pageNumbers = useMemo(() => {
    const nums: (number | "...")[] = [];
    const maxLen = 7;
    if (totalPages <= maxLen) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else {
      const add = (n: number) => nums.push(n);
      const left = Math.max(2, clampedPage - 1);
      const right = Math.min(totalPages - 1, clampedPage + 1);
      add(1);
      if (left > 2) nums.push("...");
      for (let i = left; i <= right; i++) add(i);
      if (right < totalPages - 1) nums.push("...");
      add(totalPages);
    }
    return nums;
  }, [clampedPage, totalPages]);

  /* ============================ UI ============================ */
  return (
    <div className="h-full p-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-200 pb-3">
        จัดการรายการอาหาร
      </h1>

      <div className="h-full bg-gray-50">
        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto pb-2">
            {["All Dishes", ...foodTypes.map((t) => t.name)].map((tab) => (
              <motion.button
                key={tab}
                className={`cursor-pointer px-4 py-2 text-lg font-medium whitespace-nowrap ${
                  activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: 1.02, transition: { duration: 0.1 } }}
                whileTap={{ scale: 0.98 }}
              >
                {tab}
              </motion.button>
            ))}
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">แสดงต่อหน้า</span>
            <select
              className="cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            >
              {[8, 12, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          {/* Dialog Add/Edit */}
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetFormAndState();
            }}
          >
            <DialogTrigger asChild>
              <motion.div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-colors duration-200"
                style={{ minHeight: "220px" }}
                whileHover={{ scale: 1.03, boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={() => setEditingMenu(null)}
              >
                <PlusIcon className="h-10 w-10 mb-2" />
                <span className="text-lg">Add new dish</span>
              </motion.div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[480px] p-6 bg-white rounded-lg shadow-xl border border-gray-200 overflow-y-auto max-h-[90vh]">
              <motion.div initial="hidden" animate="visible" variants={dialogContentVariants} className="h-full flex flex-col">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-bold text-gray-800">
                    {editingMenu ? "Edit Dish" : "Add New Dish"}
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    {editingMenu ? `แก้ไขเมนู: ${editingMenu.menu_name}` : "เพิ่มเมนูอาหารใหม่"}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={editingMenu ? handleUpdateFood : handleAddFood} className="grid gap-5 flex-grow" ref={formRef}>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dishName" className="text-right font-medium text-gray-700">
                      ชื่อเมนูอาหาร
                    </Label>
                    <Input id="dishName" name="dishName" className="col-span-3 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right font-medium text-gray-700">
                      ราคา (฿)
                    </Label>
                    <Input id="price" name="price" type="number" className="col-span-3 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                  </div>

                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right mt-2 font-medium text-gray-700">ประเภท</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-y-2 gap-x-4">
                      {foodTypes.map((type) => (
                        <motion.div
                          key={type.id}
                          className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
                          whileHover={{ x: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Checkbox
                            id={`type-${type.id}`}
                            checked={selectedTypes.includes(type.id)}
                            onCheckedChange={() => toggleTypeSelection(type.id)}
                            className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <Label htmlFor={`type-${type.id}`} className="text-gray-700 cursor-pointer">
                            {type.name}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* รูปภาพ */}
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="images" className="cursor-pointer text-right font-medium text-gray-700">
                      รูปเมนู
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="images"
                        name="images"
                        type="file"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        accept="image/*"
                        onChange={handleFileChange}
                        multiple
                      />

                      {/* รูปเดิม */}
                      {existingImages.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">รูปภาพเดิม:</p>
                          <div className="flex gap-2 flex-wrap">
                            {existingImages.map((image, index) => (
                              <div
                                key={`existing-${image.menu_image_id || index}`}
                                className={`relative w-24 h-24 rounded-md overflow-hidden border-2 ${
                                  mainExistingImageIndex === index ? "border-green-500" : "border-gray-300"
                                } transition-all duration-200`}
                              >
                                <Image src={`${config.apiUrl}${image.menu_image}`} alt={`Existing ${index}`} fill style={{ objectFit: "cover" }} />
                                <div
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                  onClick={() => handleSelectMainImage(index, false)}
                                >
                                  {mainExistingImageIndex === index ? (
                                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                                  ) : (
                                    <span className="text-white text-xs text-center font-medium">เลือกเป็นรูปหลัก</span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                  onClick={() => handleRemoveExistingImage(image.menu_image_id!)}
                                  title="ลบรูปภาพนี้"
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* รูปใหม่ */}
                      {imagePreviews.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">รูปภาพใหม่:</p>
                          <div className="flex gap-2 flex-wrap">
                            {imagePreviews.map((src, index) => (
                              <div
                                key={`new-${index}`}
                                className={`relative w-24 h-24 rounded-md overflow-hidden border-2 ${
                                  mainImageIndex === index ? "border-blue-500" : "border-gray-300"
                                } transition-all duration-200`}
                              >
                                <Image src={src} alt={`Preview ${index}`} fill style={{ objectFit: "cover" }} />
                                <div
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                  onClick={() => handleSelectMainImage(index, true)}
                                >
                                  {mainImageIndex === index ? (
                                    <CheckCircleIcon className="h-8 w-8 text-blue-400" />
                                  ) : (
                                    <span className="text-white text-xs text-center font-medium">เลือกเป็นรูปหลัก</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right font-medium text-gray-700">
                      คำอธิบาย
                    </Label>
                    <Textarea id="description" name="description" className="col-span-3 h-24 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>

                  {/* สถานะเมนู (คงรูปแบบเดิม) */}
                  <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white/70 p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="menu_status" className="text-slate-700">
                        สถานะเมนู
                      </Label>
                      <p className="text-xs text-slate-500">เปิด/ปิดการขายเมนูนี้</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">
                        {(editingMenu?.menu_status ?? 1) === 1 ? "Active" : "Inactive"}
                      </span>
                      <Switch
                        id="menu_status"
                        checked={(editingMenu?.menu_status ?? 1) === 1}
                        onCheckedChange={(checked) =>
                          setEditingMenu((prev) =>
                            prev
                              ? { ...prev, menu_status: checked ? 1 : 0 }
                              : {
                                  menu_id: 0,
                                  menu_name: "",
                                  menu_price: 0,
                                  menu_status: checked ? 1 : 0,
                                  MenuImages: [],
                                  Typefoods: [],
                                }
                          )
                        }
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>

                  {/* ✅ ส่วนใหม่: จำกัดจำนวน + สต็อก */}
                  <div className="rounded-md border border-gray-200 bg-white/70 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isLimited" className="text-slate-700">
                          จำกัดจำนวน
                        </Label>
                        <p className="text-xs text-slate-500">เปิดถ้าต้องการควบคุมจำนวนคงเหลือของเมนูนี้</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700">{limited ? "จำกัด" : "ไม่จำกัด"}</span>
                        <Switch
                          id="isLimited"
                          checked={limited}
                          onCheckedChange={(checked) => {
                            setLimited(checked);
                            if (!checked) setStock("");
                          }}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="stock" className={`text-right font-medium ${limited ? "text-gray-700" : "text-gray-400"}`}>
                        จำนวนคงเหลือ
                      </Label>
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        min={0}
                        className="col-span-3 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        disabled={!limited}
                        placeholder={limited ? "เช่น 20" : "ปิดอยู่"}
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100 mt-auto">
                    <motion.button
                      type="submit"
                      className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 ease-in-out font-semibold text-lg"
                      whileHover={{ scale: 1.05, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)" }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {editingMenu ? "บันทึกการแก้ไข" : "บันทึกเมนูใหม่"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </DialogContent>
          </Dialog>

          {/* Cards (paged) */}
          <AnimatePresence>
            {pageFoods.map((food, index) => {
              const menuImages = food.MenuImages || [];
              const mainImage = menuImages.find((img) => img.menu_status === 1);
              const imageUrl = mainImage ? `${config.apiUrl}${mainImage.menu_image}` : "";
              return (
                <motion.div
                  key={food.menu_id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <FoodCard
                    id={food.menu_id}
                    name={food.menu_name}
                    price={food.menu_price}
                    image={imageUrl}
                    onEdit={() => handleEditFood(food.menu_id)}
                    onDelete={() => handleDeleteFood(food.menu_id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Pagination bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            แสดง {Math.min(filteredFoods.length, pageStart + 1)}–
            {Math.min(filteredFoods.length, pageStart + pageFoods.length)} จาก {filteredFoods.length} รายการ
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" className="cursor-pointer h-8" onClick={() => changePage(clampedPage - 1)} disabled={clampedPage <= 1}>
              ก่อนหน้า
            </Button>

            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-gray-500 select-none">
                  …
                </span>
              ) : (
                <Button
                  key={`p-${p}`}
                  variant={p === clampedPage ? "default" : "outline"}
                  className="cursor-pointer h-8 w-9 px-0"
                  onClick={() => changePage(p as number)}
                >
                  {p}
                </Button>
              )
            )}

            <Button variant="outline" className="cursor-pointer h-8" onClick={() => changePage(clampedPage + 1)} disabled={clampedPage >= totalPages}>
              ถัดไป
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
