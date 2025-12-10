'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

// ✅ 1. สร้าง Type ระบุว่ารับค่าอะไรบ้าง
interface FoodCardProps {
  id: number | string;
  name: string;
  price: number | string;
  image?: string | null; // รับ string, null หรือไม่ส่งมาก็ได้
  onEdit: () => void;    // เป็นฟังก์ชัน
  onDelete: () => void;  // เป็นฟังก์ชัน
}

// ✅ 2. เอา Type ไปใส่หลัง props
export default function FoodCard({ id, name, price, image, onEdit, onDelete }: FoodCardProps) {
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:scale-105"
      style={{ minHeight: '220px' }}
    >
      <div className="relative w-full h-36">
        <Image
          src={image || '/placeholder.jpg'}
          alt={name}
          fill
          style={{ objectFit: "cover" }}
          className="rounded-t-lg"
          // เพิ่ม sizes เพื่อประสิทธิภาพ
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-4 flex flex-col justify-between items-center text-center">
        <h3 className="text-lg font-semibold text-gray-800 truncate w-full mb-1">{name}</h3>
        <p className="text-blue-600 font-bold mb-3">{price} ฿</p>
        <div className="flex space-x-2 w-full">
          <Button
            variant="secondary"
            className="cursor-pointer flex-1 text-gray-800 border border-blue-400 hover:bg-blue-600 hover:text-white"
            onClick={onEdit}
          >
            Edit dish
          </Button>
          <Button
            variant="destructive"
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