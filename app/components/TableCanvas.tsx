"use client";

import { useDrop } from "react-dnd";
import { TableCard } from "./TableCard";
import { TrashDropZone } from "./TrashDropZone";
import { useRef, useEffect, useMemo } from "react";

// --- แก้ไขตรงนี้: เติมเครื่องหมาย ? หลังชื่อตัวแปรที่อาจไม่มีค่า ---
type Table = {
  id: string;
  x: number;
  y: number;
  active: boolean;
  name: string;
  seats: number;
  tableTypeId: string;
  tableTypeName?: string; // <--- แก้เป็น optional
  additionalInfo?: string; // <--- แก้เป็น optional เผื่อไว้ด้วย
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
  onTableEdit: (id: string) => void;
  numRows: number;
  numCols: number;
}

const GRID_SIZE = 80;
const PADDING = 80;

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
  onTableEdit,
  numRows,
  numCols,
}: TableCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // Calculate canvas dimensions
  const { minWidth, minHeight, backgroundImage, backgroundPosition, backgroundSize } = useMemo(() => {
    const gridBasedWidth = numCols * GRID_SIZE + PADDING;
    const gridBasedHeight = numRows * GRID_SIZE + PADDING;

    let tableBasedWidth = GRID_SIZE * 4;
    let tableBasedHeight = GRID_SIZE * 4;

    if (tables.length > 0) {
      const maxX = Math.max(...tables.map((t) => t.x));
      const maxY = Math.max(...tables.map((t) => t.y));
      tableBasedWidth = maxX + GRID_SIZE + PADDING;
      tableBasedHeight = maxY + GRID_SIZE + PADDING;
    }

    const calculatedWidth = Math.max(gridBasedWidth, tableBasedWidth);
    const calculatedHeight = Math.max(gridBasedHeight, tableBasedHeight);

    // Generate vertical lines
    const verticalLines = Array.from({ length: numCols + 1 }).map(() => 'linear-gradient(#e0e0e0, #e0e0e0)').join(', ');
    const verticalPositions = Array.from({ length: numCols + 1 }).map((_, i) => `${i * GRID_SIZE}px 0`).join(', ');
    const verticalSizes = Array.from({ length: numCols + 1 }).map(() => '1px 100%').join(', ');

    // Generate horizontal lines
    const horizontalLines = Array.from({ length: numRows + 1 }).map(() => 'linear-gradient(90deg, #e0e0e0, #e0e0e0)').join(', ');
    const horizontalPositions = Array.from({ length: numRows + 1 }).map((_, i) => `0 ${i * GRID_SIZE}px`).join(', ');
    const horizontalSizes = Array.from({ length: numRows + 1 }).map(() => '100% 1px').join(', ');

    const bgImage = `${verticalLines}, ${horizontalLines}`;
    const bgPosition = `${verticalPositions}, ${horizontalPositions}`;
    const bgSize = `${verticalSizes}, ${horizontalSizes}`;

    return { minWidth: calculatedWidth, minHeight: calculatedHeight, backgroundImage: bgImage, backgroundPosition: bgPosition, backgroundSize: bgSize };
  }, [tables, numRows, numCols]);

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

      const maxX = (numCols - 1) * GRID_SIZE;
      const maxY = (numRows - 1) * GRID_SIZE;
      const boundedX = Math.max(0, Math.min(snappedX, maxX));
      const boundedY = Math.max(0, Math.min(snappedY, maxY));

      onTablePositionChange(item.id, boundedX, boundedY);
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
      className="relative rounded-lg bg-violet-50 border border-dashed"
      style={{
        backgroundImage,
        backgroundPosition,
        backgroundSize,
        backgroundRepeat: 'no-repeat',
        width: `${minWidth}px`,
        height: `${minHeight}px`,
      }}
    >
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table as any}
          onSwitch={() => onTableToggleActive(table.id, !table.active)}
          onEdit={onTableEdit}
        />
      ))}

      <div className="absolute top-30 right-0">
        <TrashDropZone onDrop={onTableDelete} />
      </div>
    </div>
  );
}