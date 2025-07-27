"use client";

import { useDrop } from "react-dnd";
import { TableCard } from "./TableCard";
import { TrashDropZone } from "./TrashDropZone";
import { useRef, useEffect } from "react";

type Table = {
  id: string;
  x: number;
  y: number;
  active: boolean;
  name: string;
  seats: number;
  tableTypeId: string; // ทำให้เป็น required ตาม TableData interface
  tableTypeName: string;
  additionalInfo: string; // ทำให้เป็น required ตาม TableData interface
};

type DragItem = {
  id: string;
  x: number;
  y: number;
  active: boolean;
};

interface TableCanvasProps {
  tables: Table[];
  onTablePositionChange: (id: string, x: number, y: number) => void;
  onTableToggleActive: (id: string, active: boolean) => void;
  onTableDelete: (id: string) => void;
  onTableEdit: (id: string) => void; // **เพิ่ม prop นี้**
}

const GRID_SIZE = 120;

function snapToGrid(
  x: number,
  y: number,
  gridSize = GRID_SIZE
): [number, number] {
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  return [snappedX, snappedY];
}

export function TableCanvas({
  tables,
  onTablePositionChange,
  onTableToggleActive,
  onTableDelete,
  onTableEdit, // **รับ prop นี้เข้ามา**
}: TableCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop<DragItem>(() => ({
    accept: "TABLE_CARD",
    drop: async (item, monitor) => {
      const offset = monitor.getClientOffset();
      const map = mapRef.current;
      if (!offset || !map) return;

      const rect = map.getBoundingClientRect();
      const [snappedX, snappedY] = snapToGrid(
        offset.x - rect.left,
        offset.y - rect.top
      );

      onTablePositionChange(item.id, snappedX, snappedY);
    },
  }));

  useEffect(() => {
    if (mapRef.current) {
      drop(mapRef.current);
    }
  }, [drop]);

  return (
    <div
      id="map-zone"
      ref={mapRef}
      className="relative w-full h-[600px] rounded-lg bg-violet-50 border border-dashed"
      style={{
        backgroundImage: `linear-gradient(90deg, #e0e0e0 1px, transparent 1px),
                               linear-gradient(#e0e0e0 1px, transparent 1px)`,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    >
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          onSwitch={() => onTableToggleActive(table.id, !table.active)}
          onEdit={onTableEdit} // **ส่ง prop นี้ลงไป**
        />
      ))}

      <TrashDropZone onDrop={onTableDelete} />
    </div>
  );
}