// app/backoffice/table/page.tsx
"use client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TableMap } from "../../components/TableMap";
import { Toolbar } from "../../components/Toolbar";
import { useState } from "react";

export default function TablePage() {
  const [reload, setReload] = useState(false);
  const [counter, setCounter] = useState(4);

  const handleAdd = () => {
    const tables = localStorage.getItem("temp-tables");
    const list = tables ? JSON.parse(tables) : [];
    list.push({ id: String(counter).padStart(2, "0"), x: 100, y: 100, active: true });
    localStorage.setItem("temp-tables", JSON.stringify(list));
    setCounter((c) => c + 1);
    setReload((r) => !r);
  };

  const handleReset = () => {
    localStorage.removeItem("temp-tables");
    setCounter(4);
    setReload((r) => !r);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">จัดการโต๊ะอาหาร</h1>
          <Toolbar onAdd={handleAdd} onReset={handleReset} />
        </div>
        <TableMap reload={reload} />
      </div>
    </DndProvider>
  );
}
