"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import Image from "next/image"; // Import Image from next/image for optimized images
import { PlusIcon, TagIcon } from "@heroicons/react/24/outline"; // Example icons, you might use shadcn/ui or lucide-react

// Assuming FoodCard is in components/FoodCard.jsx
import FoodCard from "../../components/ui/FoodCard";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui button
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Assuming shadcn/ui dialog
import { Input } from "@/components/ui/input"; // Assuming shadcn/ui input
import { Label } from "@/components/ui/label"; // Assuming shadcn/ui label
import { Textarea } from "@/components/ui/textarea"; // Assuming shadcn/ui textarea

export default function FoodsManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Hot Dishes"); // State for active tab

  // Dummy food data (replace with actual API fetch)
  const [foods, setFoods] = useState([
  ]);

  // Authentication check
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
  }, [router]);

  const filteredFoods = foods.filter((food) => food.category === activeTab);

  
  const handleAddFood = () => {
    
    console.log("Add new dish clicked");
  };

  const handleEditFood = (foodId) => {
    console.log("Edit dish clicked for ID:", foodId);
  
  };

  return (
    <div className="h-full p-6">
    <div className="h-full p- bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการรายการอาหาร</h1>
        <Button variant="outline" className="flex items-center space-x-2">
          <TagIcon className="h-5 w-5" />
          <span>หมวดหมู่</span>
        </Button>
      </div>



      {/* Tabs for categories */}
      <div className="flex border-b border-gray-200 mb-8">
        {[
          "Hot Dishes",
          "Cold Dishes",
          "Soup",
          "Grill",
          "Appetizer",
          "Dessert",
        ].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-lg font-medium ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Food Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
        {/* Add New Dish Card */}
        <Dialog>
          <DialogTrigger asChild>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-colors duration-200"
              style={{ minHeight: "220px" }} // Adjust height to match other cards
            >
              <PlusIcon className="h-10 w-10 mb-2" />
              <span className="text-lg">Add new dish</span>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Dish</DialogTitle>
              <DialogDescription>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dishName" className="text-right">
                  Dish Name
                </Label>
                <Input id="dishName" defaultValue="" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price (฿)
                </Label>
                <Input
                  id="price"
                  defaultValue=""
                  type="number"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Input
                  id="category"
                  defaultValue={activeTab}
                  className="col-span-3"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageUrl" className="text-right">
                  Image URL
                </Label>
                <Input id="imageUrl" defaultValue="" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea id="description" className="col-span-3" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save Dish</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Render existing Food Cards */}
        {filteredFoods.map((food) => (
          <FoodCard
            key={food.id}
            id={food.id}
            name={food.name}
            price={food.price}
            image={food.image}
            onEdit={() => handleEditFood(food.id)}
          />
        ))}
      </div>

      {/* Action Buttons
      <div className="flex justify-end space-x-4 mt-8">
        <Button variant="outline">Discard Changes</Button>
        <Button>Save Changes</Button>
      </div> */}
    </div>
    </div>
  );
}
