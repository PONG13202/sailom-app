// "use client";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Plus } from "lucide-react";
// import { motion } from "framer-motion";
// import { useState, useEffect } from "react";
// import Swal from "sweetalert2";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"; // ตรวจสอบว่ามี Select component อยู่จริง

// interface AddTableDialogProps {
//   seatOptions: { id: string; seats: number }[];
//   tableTypes: { id: string; name: string }[];
//   onAdd: (data: {
//     name: string;
//     seats: number;
//     tableTypeId: string;
//     tags: string[];
//   }) => Promise<boolean>;
// }

// export function AddTableDialog({
//   seatOptions,
//   tableTypes,
//   onAdd,
// }: AddTableDialogProps) {
//   const [open, setOpen] = useState(false);
//   const [name, setName] = useState("");
//   const [seats, setSeats] = useState(""); // เก็บเป็น string ก่อน parse
//   const [tableTypeId, setTableTypeId] = useState("");
//   const [tagInput, setTagInput] = useState("");
//   const [selectedTags, setSelectedTags] = useState<string[]>([]);

//   useEffect(() => {
//     if (open) {
//       // Reset all fields when dialog opens
//       setName("");
//       setSeats("");
//       setTableTypeId("");
//       setTagInput("");
//       setSelectedTags([]);
//     }
//   }, [open]);

//   const handleSubmit = async () => {
//     if (!name.trim() || !seats || !tableTypeId) {
//       Swal.fire({
//         icon: "error",
//         title: "ข้อมูลไม่ครบถ้วน",
//         text: "กรุณาระบุชื่อโต๊ะ, จำนวนที่นั่ง และประเภทโต๊ะ",
//       });
//       return;
//     }

//     const parsedSeats = parseInt(seats);
//     if (isNaN(parsedSeats) || parsedSeats <= 0) {
//       Swal.fire({
//         icon: "error",
//         title: "ข้อมูลไม่ถูกต้อง",
//         text: "จำนวนที่นั่งต้องเป็นตัวเลขที่ถูกต้อง",
//       });
//       return;
//     }

//     const success = await onAdd({
//       name: name.trim(),
//       seats: parsedSeats,
//       tableTypeId,
//       tags: selectedTags,
//     });

//     if (success) {
//       setOpen(false); // ปิด Dialog หลังเพิ่มสำเร็จ
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button
//           size="icon"
//           variant="outline"
//           className="cursor-pointer rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
//           title="เพิ่มโต๊ะ"
//         >
//           <Plus className="w-5 h-5" />
//         </Button>
//       </DialogTrigger>

//       <DialogContent className="max-w-md rounded-2xl shadow-xl bg-white">
//         <motion.div
//           initial={{ opacity: 0, y: -15 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//         >
//           <DialogHeader>
//             <DialogTitle className="text-lg font-semibold text-blue-700">
//               เพิ่มโต๊ะอาหาร
//             </DialogTitle>
//           </DialogHeader>

//           <form
//             onSubmit={(e) => {
//               e.preventDefault();
//               handleSubmit();
//             }}
//             className="space-y-4 mt-2"
//           >
//             <Input
//               placeholder="ชื่อโต๊ะ (เช่น 01 หรือ A1)"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
//               required
//             />

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 จำนวนที่นั่ง
//               </label>
//               <Select value={seats} onValueChange={(val) => setSeats(val)}>
//                 <SelectTrigger className="w-full border-blue-300">
//                   <SelectValue placeholder="เลือกจำนวนที่นั่ง" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {seatOptions.length === 0 ? (
//                     <div className="p-2 text-gray-500">ไม่มีตัวเลือกที่นั่ง</div>
//                   ) : (
//                     seatOptions.map((option) => (
//                       <SelectItem key={option.id} value={option.seats.toString()}>
//                         {option.seats} ที่นั่ง
//                       </SelectItem>
//                     ))
//                   )}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 ประเภทโต๊ะ
//               </label>
//               <Select
//                 onValueChange={(val: string) => setTableTypeId(val)}
//                 value={tableTypeId}
//               >
//                 <SelectTrigger className="w-full border-blue-300">
//                   <SelectValue placeholder="เลือกประเภทโต๊ะ" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {tableTypes.length === 0 ? (
//                     <div className="p-2 text-gray-500">ไม่มีประเภทโต๊ะ</div>
//                   ) : (
//                     tableTypes.map((type) => (
//                       <SelectItem key={type.id} value={type.id}>
//                         {type.name}
//                       </SelectItem>
//                     ))
//                   )}
//                 </SelectContent>
//               </Select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 แท็ก
//               </label>

//               <div className="flex gap-2 mb-2">
//                 <Input
//                   value={tagInput}
//                   onChange={(e) => setTagInput(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter" && tagInput.trim()) {
//                       e.preventDefault();
//                       if (!selectedTags.includes(tagInput.trim())) {
//                         setSelectedTags((prev) => [...prev, tagInput.trim()]);
//                       }
//                       setTagInput("");
//                     }
//                   }}
//                   placeholder="พิมพ์แท็กแล้วกด Enter"
//                   className="flex-1"
//                 />
//                 <Button
//                   type="button"
//                   onClick={() => {
//                     if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
//                       setSelectedTags((prev) => [...prev, tagInput.trim()]);
//                       setTagInput("");
//                     }
//                   }}
//                   className="bg-blue-500 text-white hover:bg-blue-600"
//                 >
//                   เพิ่ม
//                 </Button>
//               </div>

//               <div className="flex flex-wrap gap-2">
//                 {selectedTags.map((tag, index) => (
//                   <span
//                     key={index}
//                     className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full flex items-center gap-2"
//                   >
//                     {tag}
//                     <button
//                       type="button"
//                       onClick={() =>
//                         setSelectedTags((prev) => prev.filter((t) => t !== tag))
//                       }
//                       className="text-blue-500 hover:text-red-500"
//                     >
//                       ×
//                     </button>
//                   </span>
//                 ))}
//               </div>
//             </div>

//             <DialogFooter className="mt-6 flex justify-end gap-3">
//               <Button
//                 variant="outline"
//                 onClick={() => setOpen(false)}
//                 className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
//                 type="button"
//               >
//                 ยกเลิก
//               </Button>
//               <Button
//                 type="submit"
//                 className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
//               >
//                 บันทึก
//               </Button>
//             </DialogFooter>
//           </form>
//         </motion.div>
//       </DialogContent>
//     </Dialog>
//   );
// }