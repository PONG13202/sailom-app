'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function FoodCard({ id, name, price, image, onEdit, onDelete }) {
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
          style={{ objectFit: 'cover' }}
          className="rounded-t-lg"
        />
      </div>
      <div className="p-4 flex flex-col justify-between items-center text-center">
        <h3 className="text-lg font-semibold text-gray-800 truncate w-full mb-1">
          {name}
        </h3>
        <p className="text-blue-600 font-bold mb-3">{price} ฿</p>

        {/* ปุ่มใช้ theme ของ shadcn/ui ตรงๆ */}
        <div className="flex space-x-2 w-full">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            className="flex-1 cursor-pointer"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
