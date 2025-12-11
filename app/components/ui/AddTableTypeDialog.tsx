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
// import { useEffect, useState } from "react";
// import { Plus, X } from "lucide-react";
// import { motion } from "framer-motion";
// import Swal from "sweetalert2";
// import axios from "axios";
// import { config } from "../../config";

// export function AddTableTypeDialog() {
//   const [open, setOpen] = useState(false);
//   const [name, setName] = useState("");
//   const [tableTypes, setTableTypes] = useState<{ id: string; name: string }[]>(
//     []
//   );

//   const fetchTableTypes = async () => {
//     try {
//       const res = await axios.get(`${config.apiUrl}/table_Types`);
//       if (res.status === 200) {
//         setTableTypes(res.data); // [{ id, name }]
//       }
//     } catch (error) {
//       console.error("โหลดประเภทโต๊ะล้มเหลว", error);
//     }
//   };

//   useEffect(() => {
//     fetchTableTypes();
//   }, []);

//   const handleSubmit = async () => {
//     if (!name.trim()) return;

//     try {
//       const res = await axios.post(`${config.apiUrl}/add_TableType`, {
//         name: name.trim(),
//       });

//       if (res.status === 200 || res.status === 201) {
//         await fetchTableTypes(); // รีโหลดรายการใหม่
//         setName("");
//         Swal.fire({
//           icon: "success",
//           title: "เพิ่มประเภทโต๊ะสำเร็จ",
//           showConfirmButton: false,
//           timer: 1200,
//         });
//       }
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "เกิดข้อผิดพลาด",
//         text: "ไม่สามารถเพิ่มประเภทโต๊ะได้\n" + String(err),
//       });
//     }
//   };

//   const handleDelete = async (id: string) => {
//     try {
//       const res = await axios.delete(`${config.apiUrl}/delete_TablType/${id}`);
//       if (res.status === 200) {
//         setTableTypes((prev) => prev.filter((type) => type.id !== id));
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
//         showConfirmButton: false,
//         timer: 1500,
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
//           title="เพิ่มประเภทโต๊ะ"
//         >
//           <Plus className="w-5 h-5" />
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
//               เพิ่มประเภทโต๊ะ
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
//               placeholder="ชื่อประเภทโต๊ะ เช่น กลางแจ้ง, ริมทะเล"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
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
//             {tableTypes.length === 0 ? (
//               <p className="text-sm text-gray-500">ยังไม่มีประเภทโต๊ะ</p>
//             ) : (
//               tableTypes.map((type) => (
//                 <span
//                   key={type.id}
//                   className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-300 rounded-full text-sm"
//                 >
//                   {type.name}
//                   <button
//                     onClick={() => handleDelete(type.id)}
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
