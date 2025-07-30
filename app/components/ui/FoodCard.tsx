'use client'; // ถ้าต้องการ client-side features (เช่น onClick), แต่ถ้าไม่จำเป็นลบได้

import Image from 'next/image'; // Import Image from next/image
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button

export default function FoodCard({ id, name, price, image, onEdit, onDelete }) { // เพิ่ม image และ onDelete เข้ามา
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:scale-105"
      style={{ minHeight: '220px' }} // Ensure consistent height
    >
      <div className="relative w-full h-36"> {/* Fixed height for image container */}
        <Image
          src={image || '/placeholder.jpg'} // ใช้ image prop ที่ส่งมา ถ้าไม่มี fallback เป็น placeholder
          alt={name}
          fill // สำหรับ Next.js 13+ (แทน layout="fill")
          style={{ objectFit: "cover" }} // Cover the area without distortion
          className="rounded-t-lg"
        />
      </div>
      <div className="p-4 flex flex-col justify-between items-center text-center">
        <h3 className="text-lg font-semibold text-gray-800 truncate w-full mb-1">{name}</h3>
        <p className="text-blue-600 font-bold mb-3">{price} ฿</p>
        <div className="flex space-x-2 w-full"> {/* เพิ่ม container สำหรับ buttons */}
          <Button
            variant="secondary"
            className="cursor-pointer flex-1 text-gray-800 border border-blue-400 hover:bg-blue-600 hover:text-white"
            onClick={onEdit}
          >
            Edit dish
          </Button>
          <Button
            variant="destructive" // หรือ variant อื่นตาม shadcn
            className="cursor-pointer flex-1 text-gray-800 border border-red-600 hover:bg-red-600 hover:text-white"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
