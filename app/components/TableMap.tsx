"use client";
import { useDrop } from "react-dnd";
import { TableCard } from "./TableCard";
import { TrashDropZone } from "./TrashDropZone";
import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { config } from "../config"; 

const GRID_SIZE = 80;

function snapToGrid(x: number, y: number, gridSize = GRID_SIZE): [number, number] {
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  return [snappedX, snappedY];
}

export function TableMap() {
  const [tables, setTables] = useState([]);
  // โหลดข้อมูลจาก backend
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await axios.get(`${config.apiUrl}/tables`);
        setTables(response.data);
      } catch (error) {
        // Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโต๊ะได้", "error");
        console.error("Error fetching tables:", error);
      }
    };
    fetchTables();
  }, []);

  // บันทึกข้อมูลลง backend เมื่อ tables เปลี่ยน
  useEffect(() => {
    const saveTables = async () => {
      try {
        await axios.post(`${config.apiUrl}/tables`, tables);
      } catch (error) {
        // Swal.fire("บันทึกล้มเหลว", "ไม่สามารถบันทึกข้อมูลโต๊ะได้", "error");
        console.error("Error saving tables:", error);
      }
    };

    if (tables.length !== 3 || tables.some((t) => t.x !== 0 && t.y !== 0)) {
      saveTables();
    }
  }, [tables]);

  const [{}, drop] = useDrop(() => ({
    accept: "TABLE_CARD",
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      const map = document.getElementById("map-zone");
      if (!offset || !map) return;

      const rect = map.getBoundingClientRect();
      const [snappedX, snappedY] = snapToGrid(offset.x - rect.left, offset.y - rect.top);

      setTables((prevTables) => {
        const existingTable = prevTables.find(
          (t) => t.x === snappedX && t.y === snappedY && t.id !== item.id
        );

        if (existingTable) {
          return prevTables.map((t) => {
            if (t.id === item.id) {
              return { ...t, x: snappedX, y: snappedY };
            } else if (t.id === existingTable.id) {
              return { ...t, x: item.x, y: item.y };
            }
            return t;
          });
        } else {
          return prevTables.map((t) =>
            t.id === item.id ? { ...t, x: snappedX, y: snappedY } : t
          );
        }
      });
    },
  }));

  const handleSwitch = (id: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: "ลบโต๊ะนี้?",
      text: "คุณแน่ใจหรือไม่ว่าต้องการลบโต๊ะนี้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่ ลบเลย",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        setTables((prev) => prev.filter((t) => t.id !== id));
        Swal.fire("ลบแล้ว!", "โต๊ะถูกลบเรียบร้อย", "success");
      }
    });
  };

  return (
    <div
      id="map-zone"
      ref={drop}
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
          onSwitch={() => handleSwitch(table.id)}
        />
      ))}

      <TrashDropZone onDrop={handleDelete} />
    </div>
  );
}
