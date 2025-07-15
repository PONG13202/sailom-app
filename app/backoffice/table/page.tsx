'use client';

import { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';

// Component สำหรับโต๊ะที่ลากได้
const Table = ({ id, left, top, moveTable }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'table',
    item: { id, left, top },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`absolute p-2 bg-blue-500 text-white rounded cursor-move ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{ left, top }}
    >
      โต๊ะ {id}
    </div>
  );
};

// Component สำหรับพื้นที่วาง
const MapArea = ({ children, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'table',
    drop: (item: { id: number; left: number; top: number }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      const left = Math.round(item.left + (delta?.x || 0));
      const top = Math.round(item.top + (delta?.y || 0));
      onDrop(item.id, left, top);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`relative w-full h-[500px] bg-gray-100 border ${isOver ? 'bg-gray-200' : ''}`}
    >
      {children}
    </div>
  );
};

// Component หลัก
export default function TableMapEditor() {
  const [tables, setTables] = useState([]);
  const mapId = 1; // สมมติว่าแก้ไขแผนที่ ID = 1

  // ดึงข้อมูลแผนที่จาก API
  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(`/api/table-maps/${mapId}`);
      setTables(response.data.elements || []);
    };
    fetchData();
  }, [mapId]);

  // อัปเดตตำแหน่งโต๊ะ
  const moveTable = (id: number, left: number, top: number) => {
    setTables((prev) =>
      prev.map((table) => (table.id === id ? { ...table, left, top } : table))
    );
  };

  // บันทึกข้อมูลไปยัง API
  const handleSave = async () => {
    try {
      await axios.put(`/api/table-maps/${mapId}`, { elements: tables });
      alert('บันทึกสำเร็จ');
    } catch (error) {
      console.error('Error saving table map:', error);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4">
        <h1 className="text-2xl mb-4">แก้ไขแผนที่การจองโต๊ะ</h1>
        <MapArea onDrop={moveTable}>
          {tables.map((table) => (
            <Table
              key={table.id}
              id={table.id}
              left={table.left}
              top={table.top}
              moveTable={moveTable}
            />
          ))}
        </MapArea>
        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          บันทึก
        </button>
      </div>
    </DndProvider>
  );
}