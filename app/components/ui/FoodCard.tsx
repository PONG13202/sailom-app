'use client'

import Image from 'next/image'; // Import Image from next/image
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui button

export default function FoodCard({ id, name, price,  onEdit }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:scale-105"
         style={{ minHeight: '220px' }}> {/* Ensure consistent height */}
      <div className="relative w-full h-36"> {/* Fixed height for image container */}
        {/* <Image
          src={image}
          alt={name}
          layout="fill" // Use fill to cover the parent div
          objectFit="cover" // Cover the area without distortion
          className="rounded-t-lg"
        /> */}
      </div>
      <div className="p-4 flex flex-col justify-between items-center text-center">
        <h3 className="text-lg font-semibold text-gray-800 truncate w-full mb-1">{name}</h3>
        <p className="text-blue-600 font-bold mb-3">{price} ฿</p>
        <Button
          variant="secondary"
          className="w-full"
          onClick={onEdit}
        >
          Edit dish
        </Button>
      </div>
    </div>
  );
}