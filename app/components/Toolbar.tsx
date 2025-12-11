// "use client";


// import { AddSeatOptionDialog } from "./ui/AddSeatOptionDialog";
// import { AddTableTypeDialog } from "./ui/AddTableTypeDialog";
// import { AddTableDialog } from "./AddTableDialog";

// type ToolbarProps = {
//   onAdd: (data: any) => void;
//   tags: { id: string; name: string }[];
//   seatOptions: { id: string; seats: number }[];
//   tableTypes: { id: string; name: string }[];
//   onAddSeatOption: (seats: number) => void;
//   onAddTableType: (name: string) => void;
// };

// export function Toolbar({ 
//   onAdd, 
//   tags, 
//   seatOptions, 
//   tableTypes, 
//   onAddSeatOption, 
//   onAddTableType 
// }: ToolbarProps) {
//   return (
//     <div className="flex flex-wrap gap-4 items-end mb-4">
//       {/* เพิ่มจำนวนที่นั่ง */}
//       <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-fit flex flex-col items-center">
//         <label className="text-sm text-gray-700 font-medium mb-2">
//           เพิ่มจำนวนที่นั่ง
//         </label>
//         <AddSeatOptionDialog onAdd={onAddSeatOption} />
//       </div>

//       {/* เพิ่มประเภทโต๊ะ */}
//       <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-fit flex flex-col items-center">
//         <label className="text-sm text-gray-700 font-medium mb-2">
//           เพิ่มประเภทโต๊ะ
//         </label>
//         <AddTableTypeDialog onAdd={onAddTableType} />
//       </div>

//       {/* เพิ่มโต๊ะอาหาร */}
//       <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm w-fit flex flex-col items-center">
//         <label className="text-sm text-gray-700 font-medium mb-2">
//           เพิ่มโต๊ะอาหาร
//         </label>
//         <AddTableDialog
//           onAdd={onAdd}
//           seatOptions={seatOptions}
//           tableTypes={tableTypes}
//           tags={tags}
//         />
//       </div>
//     </div>
//   );
// }