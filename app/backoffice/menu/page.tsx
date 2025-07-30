"use client";

import { useEffect, useState, useRef, useCallback } from "react"; // เพิ่ม useCallback
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Image from "next/image";
import { PlusIcon, TagIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline"; // เพิ่ม PencilIcon, TrashIcon
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

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

interface MenuImage { // ย้าย interface มาไว้ด้านบน
  menu_image_id?: number; // อาจมีหรือไม่มีก็ได้ตอนสร้างใหม่
  menu_id?: number;
  menu_image: string;
  menu_status: number;
}

interface FoodMenu {
  menu_id: number;
  menu_name: string;
  menu_price: number;
  menu_description?: string | null; // เพิ่ม description และเป็น optional/nullable
  menu_status: number;
  MenuImages: MenuImage[]; // ใช้ interface ที่ย้ายมา
  Typefoods: { typefood: { id: number; name: string } }[];
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const dialogContentVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function FoodsManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All Dishes");
  const [foodTypes, setFoodTypes] = useState<{ id: number; name: string }[]>(
    []
  );
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [foods, setFoods] = useState<FoodMenu[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // === State สำหรับจัดการรูปภาพในการเพิ่ม/แก้ไข ===
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // ไฟล์รูปใหม่ที่เลือก
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // URL สำหรับรูปใหม่ที่ preview
  const [mainImageIndex, setMainImageIndex] = useState<number | null>(null); // index ของรูปหลัก (สำหรับรูปใหม่)

  const [existingImages, setExistingImages] = useState<MenuImage[]>([]); // รูปภาพเดิมจาก DB
  const [mainExistingImageIndex, setMainExistingImageIndex] = useState<number | null>(null); // index ของรูปหลักจากรูปเดิม

  // === State สำหรับเมนูที่กำลังแก้ไข ===
  const [editingMenu, setEditingMenu] = useState<FoodMenu | null>(null);

  // เพิ่ม ref สำหรับ form เพื่อใช้ reset
  const formRef = useRef<HTMLFormElement>(null);

  const fetchFoodTypes = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/foodTypes`);
      if (response.status === 200 && Array.isArray(response.data)) {
        setFoodTypes(response.data);
      }
    } catch (err) {
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
    }
    fetchFoodTypes();
    fetchFoods();
  }, [router]);

  // ฟังก์ชันสำหรับเคลียร์ค่าฟอร์มและ State ทั้งหมด (สำหรับเพิ่ม/แก้ไข)
  const resetFormAndState = useCallback(() => {
    if (formRef.current) {
      formRef.current.reset(); // รีเซ็ตค่า input fields
    }
    setSelectedTypes([]); // เคลียร์ประเภทอาหารที่เลือก
    setSelectedFiles([]); // เคลียร์ไฟล์ที่เลือก
    imagePreviews.forEach(url => URL.revokeObjectURL(url)); // ปล่อย memory ของ image previews
    setImagePreviews([]); // เคลียร์พรีวิวรูปภาพ
    setMainImageIndex(null); // เคลียร์รูปหลักของรูปใหม่
    setExistingImages([]); // เคลียร์รูปภาพเดิม
    setMainExistingImageIndex(null); // เคลียร์รูปหลักของรูปเดิม
    setEditingMenu(null); // เคลียร์เมนูที่กำลังแก้ไข
  }, [imagePreviews]); // dependency array for useCallback

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTypes.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกประเภทอาหาร",
        text: "เมนูต้องมีอย่างน้อยหนึ่งประเภท",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    if (selectedFiles.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาอัปโหลดรูปภาพเมนู",
        text: "เมนูต้องมีอย่างน้อยหนึ่งรูปภาพ",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    let finalMainImageIndex = mainImageIndex;
    if (selectedFiles.length > 1 && finalMainImageIndex === null) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกรูปภาพหลัก",
        text: "หากมีหลายรูปภาพ ต้องเลือกรูปภาพหลัก 1 รูป",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }
    if (selectedFiles.length === 1 && finalMainImageIndex === null) {
      finalMainImageIndex = 0;
    }


    const formData = new FormData();
    formData.append("menu_name", (e.target as HTMLFormElement).dishName.value);
    formData.append("menu_price", (e.target as HTMLFormElement).price.value);
    formData.append(
      "menu_description",
      (e.target as HTMLFormElement).description.value
    );
    formData.append("typefoodIds", JSON.stringify(selectedTypes));

    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });
    if (finalMainImageIndex !== null) {
      formData.append("mainImageIndex", finalMainImageIndex.toString());
    }


    try {
      await axios.post(`${config.apiUrl}/add_menu`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      Swal.fire({
        icon: "success",
        title: "เพิ่มเมนูสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });
      fetchFoods();
      setIsDialogOpen(false);
      resetFormAndState(); // เรียกใช้ฟังก์ชัน reset หลังจากเพิ่มสำเร็จ
    } catch (err: any) {
      console.error("Error adding food:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text:
          "ไม่สามารถเพิ่มเมนูได้: " +
          (err.response?.data?.message || err.message),
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
      if (result.isConfirmed) {
        try {
          await axios.delete(`${config.apiUrl}/delete_menu/${menuId}`);
          Swal.fire({
            icon: "success",
            title: "ลบเมนูสำเร็จ",
            showConfirmButton: false,
            timer: 1500,
          });
          fetchFoods();
        } catch (err: any) {
          console.error(
            "Error deleting food:",
            err.response?.data || err.message
          );
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text:
              "ไม่สามารถลบเมนูได้: " +
              (err.response?.data?.message || err.message),
            showConfirmButton: false,
            timer: 2000,
          });
        }
      }
    });
  };

  // --- ฟังก์ชันสำหรับ Edit ---
  const handleEditFood = (menuId: number) => {
    const menuToEdit = foods.find((food) => food.menu_id === menuId);
    if (menuToEdit) {
      setEditingMenu(menuToEdit); // ตั้งค่าเมนูที่กำลังแก้ไข
      setIsDialogOpen(true); // เปิด Dialog

      // ตั้งค่าฟอร์มด้วยข้อมูลเมนูเดิม
      // ใช้ setTimeout เพื่อให้แน่ใจว่า Dialog เปิดและ DOM พร้อม
      setTimeout(() => {
        if (formRef.current) {
          (formRef.current.elements.namedItem("dishName") as HTMLInputElement).value = menuToEdit.menu_name;
          (formRef.current.elements.namedItem("price") as HTMLInputElement).value = menuToEdit.menu_price.toString();
          (formRef.current.elements.namedItem("description") as HTMLTextAreaElement).value = menuToEdit.menu_description || '';
        }

        // ตั้งค่าประเภทอาหารที่เลือก
        setSelectedTypes(menuToEdit.Typefoods.map(tf => tf.typefood.id));

        // ตั้งค่ารูปภาพเดิม
        setExistingImages(menuToEdit.MenuImages);
        const mainImg = menuToEdit.MenuImages.find(img => img.menu_status === 1);
        if (mainImg) {
          setMainExistingImageIndex(menuToEdit.MenuImages.indexOf(mainImg));
        } else {
          setMainExistingImageIndex(null);
        }

        // เคลียร์รูปภาพใหม่ที่อาจจะเคยเลือกไว้ก่อนหน้า
        setSelectedFiles([]);
        setImagePreviews([]);
        setMainImageIndex(null);
      }, 0);
    }
  };

  const handleUpdateFood = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingMenu) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่พบเมนูที่ต้องการอัปเดต",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    if (selectedTypes.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกประเภทอาหาร",
        text: "เมนูต้องมีอย่างน้อยหนึ่งประเภท",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    // ตรวจสอบว่ามีรูปภาพอย่างน้อยหนึ่งรูป (รูปเดิมหรือรูปใหม่)
    if (selectedFiles.length === 0 && existingImages.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาอัปโหลดรูปภาพเมนู",
        text: "เมนูต้องมีอย่างน้อยหนึ่งรูปภาพ",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    // Logic การจัดการรูปภาพหลัก
    let finalMainImageIdentifier: string | number | null = null; // เก็บ path รูปเดิม หรือ index รูปใหม่
    if (selectedFiles.length > 0) { // มีรูปใหม่
      if (selectedFiles.length > 1 && mainImageIndex === null) {
        Swal.fire({
          icon: "warning",
          title: "กรุณาเลือกรูปภาพหลัก (รูปใหม่)",
          text: "หากมีหลายรูปภาพใหม่ ต้องเลือกรูปภาพหลัก 1 รูป",
          showConfirmButton: false,
          timer: 2000,
        });
        return;
      }
      finalMainImageIdentifier = mainImageIndex === null && selectedFiles.length === 1 ? 0 : mainImageIndex;
      // Note: mainImageIdentifier จะเป็น index ของ selectedFiles
    } else { // ไม่มีรูปใหม่ มีแต่รูปเดิม
      if (existingImages.length > 1 && mainExistingImageIndex === null) {
        Swal.fire({
          icon: "warning",
          title: "กรุณาเลือกรูปภาพหลัก (รูปเดิม)",
          text: "หากมีหลายรูปภาพเดิม ต้องเลือกรูปภาพหลัก 1 รูป",
          showConfirmButton: false,
          timer: 2000,
        });
        return;
      }
      finalMainImageIdentifier = mainExistingImageIndex === null && existingImages.length === 1 ? 
                                  existingImages[0].menu_image // ใช้ path รูปแรกเป็นรูปหลักถ้ามีรูปเดียว
                                  : existingImages[mainExistingImageIndex as number]?.menu_image || null;
      // Note: mainImageIdentifier จะเป็น path ของรูปเดิม
    }


    const formData = new FormData();
    formData.append("menu_name", (e.target as HTMLFormElement).dishName.value);
    formData.append("menu_price", (e.target as HTMLFormElement).price.value);
    formData.append(
      "menu_description",
      (e.target as HTMLFormElement).description.value
    );
    formData.append("typefoodIds", JSON.stringify(selectedTypes));

    // เพิ่มรูปภาพเดิมเข้าไปใน FormData ด้วย (ในรูปแบบที่ Backend จะเข้าใจ)
    formData.append("existingImages", JSON.stringify(existingImages));

    // เพิ่มรูปภาพใหม่
    selectedFiles.forEach((file) => {
      formData.append("newImages", file); // เปลี่ยนชื่อเป็น newImages
    });

    // ส่งค่า mainImageIdentifier ไปให้ Backend
    if (finalMainImageIdentifier !== null) {
      formData.append("mainImageIdentifier", finalMainImageIdentifier.toString());
    } else {
      formData.append("mainImageIdentifier", ""); // ส่งค่าว่างถ้าไม่มีรูปหลัก
    }


    try {
      await axios.put(`${config.apiUrl}/update_menu/${editingMenu.menu_id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      Swal.fire({
        icon: "success",
        title: "อัปเดตเมนูสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });
      fetchFoods();
      setIsDialogOpen(false);
      resetFormAndState(); // เรียกใช้ฟังก์ชัน reset หลังจากอัปเดตสำเร็จ
    } catch (err: any) {
      console.error("Error updating food:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text:
          "ไม่สามารถอัปเดตเมนูได้: " +
          (err.response?.data?.message || err.message),
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };


  const toggleTypeSelection = (typeId: number) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // ก่อนจะสร้าง preview ใหม่ ให้ revokeObjectURL ของ preview เก่าก่อน
      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);

      const newPreviewImages: string[] = filesArray.map((file) => URL.createObjectURL(file));
      setImagePreviews(newPreviewImages);

      // ถ้ามีรูปใหม่ถูกเลือก ให้รีเซ็ต mainExistingImageIndex และตั้ง mainImageIndex (ของรูปใหม่)
      setMainExistingImageIndex(null); 
      if (filesArray.length === 1) {
        setMainImageIndex(0);
      } else {
        setMainImageIndex(null);
      }

    } else {
      // เมื่อไม่มีไฟล์ถูกเลือก ให้เคลียร์ preview เก่าด้วย
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setImagePreviews([]);
      setMainImageIndex(null);
    }
  };

  const handleSelectMainImage = (index: number, isNewImage: boolean = true) => {
    if (isNewImage) {
      setMainImageIndex(index);
      setMainExistingImageIndex(null); // ถ้าเลือกรูปใหม่เป็นรูปหลัก ให้เคลียร์รูปหลักเดิม
    } else {
      setMainExistingImageIndex(index);
      setMainImageIndex(null); // ถ้าเลือกรูปเดิมเป็นรูปหลัก ให้เคลียร์รูปหลักใหม่
    }
  };

  // ฟังก์ชันลบรูปภาพเดิมออกจาก preview (ยังไม่ได้ลบจาก Server)
  const handleRemoveExistingImage = (imageIdToRemove: number) => {
    setExistingImages((prevImages) => {
      const updatedImages = prevImages.filter(img => img.menu_image_id !== imageIdToRemove);
      
      // ถ้าลบรูปหลักเดิมออกไป ให้ตั้ง mainExistingImageIndex เป็น null
      const removedIndex = prevImages.findIndex(img => img.menu_image_id === imageIdToRemove);
      if (mainExistingImageIndex !== null && removedIndex === mainExistingImageIndex) {
        setMainExistingImageIndex(null);
      } else if (mainExistingImageIndex !== null && removedIndex < mainExistingImageIndex) {
        // ถ้าลบรูปที่อยู่ก่อนหน้า index รูปหลักเดิม ให้ลด index รูปหลักเดิมลง 1
        setMainExistingImageIndex(prev => (prev !== null ? prev - 1 : null));
      }
      return updatedImages;
    });
  };


  const filteredFoods = foods.filter((food) => {
    if (activeTab === "All Dishes") return true;
    return food.Typefoods.some(
      (ft) => ft.typefood.name.toLowerCase() === activeTab.toLowerCase()
    );
  });

  return (
    <div className="h-full p-6">
              {/* <div className="flex justify-between items-center mb-6"> */}
          <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-200 pb-3">
            จัดการรายการอาหาร
          </h1>
          {/* <Button variant="outline" className="flex items-center space-x-2">
            <TagIcon className="h-5 w-5" />
            <span>หมวดหมู่</span>
          </Button> */}
        {/* </div> */}
      <div className="h-full bg-gray-50">
        <div className=" flex border-b border-gray-200 mb-8 overflow-x-auto pb-2">
          {["All Dishes", ...foodTypes.map((type) => type.name)].map((tab) => (
            <motion.button
              key={tab}
              className={`cursor-pointer px-4 py-2 text-lg font-medium whitespace-nowrap ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setActiveTab(tab)}
              whileHover={{ scale: 1.02, transition: { duration: 0.1 } }}
              whileTap={{ scale: 0.98 }}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetFormAndState(); // เมื่อ Modal ปิด ให้เคลียร์ค่า
              }
            }}
          >
            <DialogTrigger asChild>
              {/* ปุ่มเพิ่มเมนูใหม่ */}
              <motion.div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-colors duration-200"
                style={{ minHeight: "220px" }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.1)",
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={() => setEditingMenu(null)} // เมื่อกดเพิ่ม ให้แน่ใจว่าไม่ได้อยู่ในโหมดแก้ไข
              >
                <PlusIcon className="h-10 w-10 mb-2" />
                <span className="text-lg">Add new dish</span>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-6 bg-white rounded-lg shadow-xl border border-gray-200 overflow-y-auto max-h-[90vh]"> {/* เพิ่ม overflow-y-auto และ max-h */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={dialogContentVariants}
                className="h-full flex flex-col"
              >
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
                    <Label
                      htmlFor="dishName"
                      className="text-right font-medium text-gray-700"
                    >
                      ชื่อเมนูอาหาร
                    </Label>
                    <Input
                      id="dishName"
                      name="dishName"
                      className="col-span-3 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="price"
                      className="text-right font-medium text-gray-700"
                    >
                      ราคา (฿)
                    </Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      className="col-span-3 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right mt-2 font-medium text-gray-700">
                      ประเภท
                    </Label>
                    <div className="col-span-3 grid grid-cols-2 gap-y-2 gap-x-4">
                      {foodTypes.map((type: any) => (
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
                          <Label
                            htmlFor={`type-${type.id}`}
                            className="text-gray-700 cursor-pointer"
                          >
                            {type.name}
                          </Label>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4"> {/* เปลี่ยนจาก items-center เป็น items-start */}
                    <Label
                      htmlFor="images"
                      className="cursor-pointer text-right font-medium text-gray-700"
                    >
                      รูปเมนู
                    </Label>
                    <div className="cursor-pointer col-span-3">
                      <Input
                        id="images"
                        name="images"
                        type="file"
                        className="cursor-pointer col-span-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        accept="image/*"
                        onChange={handleFileChange}
                        multiple
                        // ไม่ต้อง required ตรงนี้ เพราะอาจจะมีรูปเดิมอยู่แล้ว
                      />

                      {/* แสดงรูปภาพเดิม (ถ้ามี) */}
                      {existingImages.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">รูปภาพเดิม:</p>
                          <div className="flex gap-2 flex-wrap">
                            {existingImages.map((image, index) => (
                              <div
                                key={`existing-${image.menu_image_id || index}`} // ใช้ id ถ้ามี, ไม่งั้นใช้ index
                                className={`relative w-24 h-24 rounded-md overflow-hidden border-2 ${
                                  mainExistingImageIndex === index
                                    ? "border-green-500"
                                    : "border-gray-300"
                                } transition-all duration-200`}
                              >
                                <Image
                                  src={`${config.apiUrl}${image.menu_image}`}
                                  alt={`Existing ${index}`}
                                  fill
                                  style={{ objectFit: "cover" }}
                                />
                                <div
                                  className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                  onClick={() => handleSelectMainImage(index, false)} // isNewImage = false
                                >
                                  {mainExistingImageIndex === index ? (
                                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                                  ) : (
                                    <span className="text-white text-xs text-center font-medium">
                                      เลือกเป็นรูปหลัก
                                    </span>
                                  )}
                                </div>
                                {/* ปุ่มลบรูปภาพเดิม */}
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

                      {/* แสดงรูปภาพใหม่ที่เลือก (ถ้ามี) */}
                      {imagePreviews.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">รูปภาพใหม่:</p>
                          <div className="flex gap-2 flex-wrap">
                            {imagePreviews.map((imageSrc, index) => (
                              <div
                                key={`new-${index}`}
                                className={`relative w-24 h-24 rounded-md overflow-hidden border-2 ${
                                  mainImageIndex === index
                                    ? "border-blue-500"
                                    : "border-gray-300"
                                } transition-all duration-200`}
                              >
                                <Image
                                  src={imageSrc}
                                  alt={`Preview ${index}`}
                                  fill
                                  style={{ objectFit: "cover" }}
                                />
                                <div
                                  className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                  onClick={() => handleSelectMainImage(index, true)} // isNewImage = true
                                >
                                  {mainImageIndex === index ? (
                                    <CheckCircleIcon className="h-8 w-8 text-blue-400" />
                                  ) : (
                                    <span className="text-white text-xs text-center font-medium">
                                      เลือกเป็นรูปหลัก
                                    </span>
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
                    <Label
                      htmlFor="description"
                      className="text-right font-medium text-gray-700"
                    >
                      คำอธิบาย
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      className="col-span-3 h-24 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-100 mt-auto">
                    <motion.button
                      type="submit"
                      className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 ease-in-out font-semibold text-lg"
                      whileHover={{
                        scale: 1.05,
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 10,
                      }}
                    >
                      {editingMenu ? "บันทึกการแก้ไข" : "บันทึกเมนูใหม่"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </DialogContent>
          </Dialog>

          <AnimatePresence>
            {filteredFoods.map((food, index) => {
                const menuImages = food.MenuImages || [];
                // สร้าง Full URL สำหรับรูปภาพหลัก
                const mainImage = menuImages.find(img => img.menu_status === 1);
                const imageUrl = mainImage ? `${config.apiUrl}${mainImage.menu_image}` : '';

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
                            image={imageUrl} // ส่ง Full URL ไปให้ FoodCard
                            onEdit={() => handleEditFood(food.menu_id)}
                            onDelete={() => handleDeleteFood(food.menu_id)}
                        />
                    </motion.div>
                );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}