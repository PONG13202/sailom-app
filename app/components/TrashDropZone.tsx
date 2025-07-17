// components/table/TrashDropZone.tsx
import { useDrop } from "react-dnd";
import { Trash2 } from "lucide-react";

export function TrashDropZone({ onDrop }: { onDrop: (id: string) => void }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TABLE_CARD",
    drop: (item: any) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`absolute bottom-6 right-6 p-4 rounded-full transition-all duration-200 ${
        isOver ? "bg-red-200" : "bg-red-100"
      }`}
    >
      <Trash2 className="text-red-600 w-6 h-6" />
    </div>
  );
}