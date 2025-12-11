'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

type FoodCardProps = {
  id: number | string;
  name: string;
  price: number;
  image?: string;
  onEdit?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
};

export default function FoodCard({
  id,
  name,
  price,
  image,
  onEdit,
  onDelete,
}: FoodCardProps) {
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

        <div className="flex space-x-2 w-full">
          {onEdit && (
            <Button
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => onEdit(id)}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              className="flex-1 cursor-pointer"
              onClick={() => onDelete(id)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
