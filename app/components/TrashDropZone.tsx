"use client";

import { useDrop } from "react-dnd";
import { Trash2 } from "lucide-react";

type DragItem = { id: string };

export function TrashDropZone({ onDrop }: { onDrop: (id: string) => void }) {
  // ✅ แก้ไขตรงนี้: ระบุ Generic Type <DragItem, unknown, { isOver: boolean }>
  const [{ isOver }, drop] = useDrop<DragItem, unknown, { isOver: boolean }>(() => ({
    accept: "TABLE_CARD",
    drop: (item) => onDrop(item.id),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div
      // ✅ แก้ไขตรงนี้: cast as any เพื่อป้องกัน ref type error
      ref={drop as any}
      className={[
        "absolute bottom-3 right-3",
        "rounded-full border shadow-md z-50 select-none",
        "flex items-center justify-center",
        "transition-transform transition-colors duration-150",
        isOver ? "bg-red-500 border-red-600 scale-110" : "bg-red-50 border-red-300",
      ].join(" ")}
      style={{
        width: 64,
        height: 64,
        touchAction: "none",
      }}
      aria-label="ทิ้งโต๊ะ"
      title="ลากโต๊ะมาทิ้งที่นี่"
    >
      <Trash2 className={isOver ? "text-white" : "text-red-600"} style={{ width: 26, height: 26 }} />
    </div>
  );
}