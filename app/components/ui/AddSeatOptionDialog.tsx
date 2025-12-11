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
// import { useState, useEffect } from "react";
// import { Plus } from "lucide-react";
// import { motion } from "framer-motion";
// import Swal from "sweetalert2";
// import axios from "axios";
// import { config } from "../../config";
// import { X } from "lucide-react";

// export function AddSeatOptionDialog() {
//   const [open, setOpen] = useState(false);
//   const [seats, setSeats] = useState("");
//   const [seatOptions, setSeatOptions] = useState<
//     { id: string; seats: number }[]
//   >([]);

//   const fetchSeats = async () => {
//     try {
//       const res = await axios.get(`${config.apiUrl}/seats`);
//       if (res.status === 200) {
//         setSeatOptions(res.data);
//       }
//     } catch (error) {
//       console.error("โหลดข้อมูลที่นั่งล้มเหลว", error);
//     }
//   };

//   useEffect(() => {
//     fetchSeats();
//   }, []);

// const handleSubmit = async () => {
//   try {
//     const parsedSeats = parseInt(seats);
//     const res = await axios.post(`${config.apiUrl}/add_seat`, {
//       seats: parsedSeats,
//     });

//     if (res.status === 200 || res.status === 201) {
  
//       await fetchSeats();     // <-- เรียก fetch ใหม่ เพื่อโหลดข้อมูลล่าสุด
//       setSeats("");          // ล้าง input
//       Swal.fire({
//         icon: "success",
//         title: "เพิ่มจำนวนที่นั่งสำเร็จ",
//         showConfirmButton: false,
//         timer: 1500,
//       });
//     }
//   } catch (err) {
//     Swal.fire({
//       icon: "error",
//       title: "เกิดข้อผิดพลาด",
//       text: "ไม่สามารถเพิ่มจำนวนที่นั่งได้\n" + String(err),
//     });
//   }
// };

//   const handleDeleteSeat = async (id: string) => {
//     try {
//       const res = await axios.delete(`${config.apiUrl}/delete_seat/${id}`);
//       if (res.status === 200) {
//         setSeatOptions((prev) => prev.filter((seat) => seat.id !== id));
//         Swal.fire({
//           icon: "success",
//           title: "ลบสำเร็จ",
//           showConfirmButton: false,
//           timer: 1000,
//         });
//       }
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "เกิดข้อผิดพลาด",
//         text: "ไม่สามารถลบได้\n" + String(err),
//       });
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button
//           variant="outline"
//           size="icon"
//           className="cursor-pointer rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
//           title="เพิ่มจำนวนที่นั่ง"
//         >
//           <Plus className=" w-5 h-5" />
//         </Button>
//       </DialogTrigger>

//       <DialogContent className="max-w-sm rounded-2xl shadow-xl bg-white">
//         <motion.div
//           initial={{ opacity: 0, y: -15 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//         >
//           <DialogHeader>
//             <DialogTitle className="text-lg font-semibold text-blue-700">
//               เพิ่มจำนวนที่นั่ง
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
//               placeholder="จำนวนที่นั่ง เช่น 2, 4, 6"
//               type="number"
//               min={1}
//               value={seats}
//               onChange={(e) => setSeats(e.target.value)}
//               className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
//               required
//             />

//             <DialogFooter className="flex justify-end gap-3 mt-6">
//               <Button
//                 variant="outline"
//                 onClick={() => setOpen(false)}
//                 type="button"
//                 className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
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
//           <div className="flex flex-wrap gap-2 mt-4">
//             {seatOptions.length === 0 ? (
//               <p className="text-sm text-gray-500">ยังไม่มีที่นั่ง</p>
//             ) : (
//               seatOptions.map((s) => (
//                 <span
//                   key={s.id}
//                   className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-300 rounded-full text-sm"
//                 >
//                   {s.seats} ที่นั่ง
//                   <button
//                     onClick={() => handleDeleteSeat(s.id)}
//                     className="cursor-pointer text-red-500 hover:text-red-700"
//                     title="ลบ"
//                   >
//                     <X className="w-3 h-3" />
//                   </button>
//                 </span>
//               ))
//             )}
//           </div>
//         </motion.div>
//       </DialogContent>
//     </Dialog>
//   );
// }
