"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

type TableData = {
  id: string;
  x: number;
  y: number;
  active: boolean;
  seats: number;
};

export function AddTableDialog({ onAdd }: { onAdd: (data: TableData) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");

  const handleSubmit = () => {
    if (!name) return;
    onAdd({
      id: name,
      x: 100,
      y: 100,
      active: true,
      seats: parseInt(seats),
    });
    setName("");
    setSeats("");
    setOpen(false);
  };

   return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
          title="เพิ่มโต๊ะ"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl shadow-xl bg-white">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-blue-700">
              เพิ่มโต๊ะอาหาร
            </DialogTitle>
          </DialogHeader>

          {/* ใส่ form ครอบ input และ footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault(); // ป้องกันรีเฟรชหน้า
              handleSubmit();
            }}
            className="space-y-5 mt-2"
          >
            <Input
              placeholder="ชื่อโต๊ะ (เช่น 01 หรือ A1)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
            />
            <Input
              placeholder="จำนวนที่นั่ง"
              type="number"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
              min={1}
            />

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
                type="button"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit" // ปุ่มนี้กด Enter แล้วจะ trigger onSubmit
                className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
              >
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}