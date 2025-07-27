"use client";

import { useDrag } from "react-dnd";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";

// ขยาย Table Type เพื่อรวมข้อมูลที่จำเป็น
type Table = {
  id: string;
  x: number;
  y: number;
  active: boolean;
  name: string; // ชื่อโต๊ะ (เช่น 01, A1)
  seats: number; // จำนวนที่นั่ง
  tableTypeName: string; // ID ประเภทโต๊ะ (ถ้าต้องการใช้)
  additionalInfo: string; // ข้อมูลเพิ่มเติม (optional)
};

interface TableCardProps {
  table: Table;
  onSwitch?: () => void;
  onEdit?: (tableId: string) => void; // เพิ่ม prop สำหรับเหตุการณ์แก้ไข
}

export function TableCard({
  table,
  onSwitch,
  onEdit, // รับ prop onEdit
}: TableCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TABLE_CARD",
    item: table,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // หยุด event bubbling เพื่อไม่ให้ Card ถูกลากเมื่อกดปุ่ม Edit
    if (onEdit) {
      onEdit(table.id);
    }
  };

  return (
    <div
      ref={drag}
      className="absolute"
      style={{ left: table.x, top: table.y, opacity: isDragging ? 0.5 : 1 }}
    >
      <Card
        className={`w-[120px] h-[120px] p-2 shadow-md flex flex-col justify-between relative ${ // เพิ่ม relative เพื่อจัดตำแหน่งปุ่ม Edit
          table.active ? "bg-white" : "bg-gray-200 opacity-60"
        } cursor-move`}
      >
        {/* ปุ่มแก้ไข */}
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer absolute top-1 right-1 h-6 w-6" // จัดตำแหน่งที่มุมขวาบน
          onClick={handleEditClick} // เรียกใช้ handleEditClick เมื่อกดปุ่ม
        >
          <PencilIcon className="w-4 h-4 text-gray-500 hover:text-blue-600" />
        </Button>

        <div className="flex flex-col items-center justify-center flex-grow pt-4">
          <p className="text-lg font-bold text-gray-800">{table.name}</p>
          <p className="text-sm text-gray-600">{table.seats} ที่นั่ง</p>
          {/* เพิ่ม tabletype */}
          <p className="text-xs text-gray-500 text-center mt-1">
            {table.tableTypeName}
          </p>
          {table.additionalInfo && (
            <p className="text-xs text-gray-500 text-center mt-1">
              {table.additionalInfo}
            </p>
          )}
        </div>
        {onSwitch && (
          <div className="flex justify-center items-center pb-1">
            <Switch checked={table.active} onCheckedChange={onSwitch} />
          </div>
        )}
      </Card>
    </div>
  );
}