"use client";

import { useEffect, useState, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { isMobile } from "react-device-detect";
import axios from "axios";
import Swal from "sweetalert2";
import { Plus, X, Grid } from "lucide-react";
import { motion } from "framer-motion";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { config } from "../../config";
import { TableCanvas } from "../../components/TableCanvas";
// import { GRID_SIZE, findFirstFreeCellPx } from "../../components/TableCanvas";

interface SeatOption {
  id: string;
  seats: number;
}

interface TableType {
  id: string;
  name: string;
}

interface TableData {
  id: string;
  name: string;
  seats: number;
  tableTypeId: string;
  additionalInfo: string;
  x: number;
  y: number;
  active: boolean;
}

export default function TablePage() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [seatOptions, setSeatOptions] = useState<SeatOption[]>([]);
  const [tableTypes, setTableTypes] = useState<TableType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddSeatOptionDialogOpen, setIsAddSeatOptionDialogOpen] = useState(false);
  const [seatOptionInput, setSeatOptionInput] = useState("");

  const [isAddTableTypeDialogOpen, setIsAddTableTypeDialogOpen] = useState(false);
  const [tableTypeInput, setTableTypeInput] = useState("");

  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("");
  const [newTableTypeId, setNewTableTypeId] = useState("");
  const [newTableAdditionalInfo, setNewTableAdditionalInfo] = useState("");

  const [isEditTableDialogOpen, setIsEditTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [editTableName, setEditTableName] = useState("");
  const [editTableSeats, setEditTableSeats] = useState("");
  const [editTableTypeId, setEditTableTypeId] = useState("");
  const [editTableAdditionalInfo, setEditTableAdditionalInfo] = useState("");

  const [numRows, setNumRows] = useState(10);
  const [numCols, setNumCols] = useState(10);
  const [isGridSizeDialogOpen, setIsGridSizeDialogOpen] = useState(false);
  const [gridRowsInput, setGridRowsInput] = useState("10");
  const [gridColsInput, setGridColsInput] = useState("10");

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    console.log("Fetching all data...");
    try {
      const tableRes = await axios.get(`${config.apiUrl}/tables`);
      setTables(tableRes.data || []);
      console.log("Tables fetched:", tableRes.data);
    } catch (error) {
      console.error("โหลดข้อมูลโต๊ะล้มเหลว:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลโต๊ะได้",
      });
    }

    try {
      const seatRes = await axios.get(`${config.apiUrl}/seats`);
      setSeatOptions(seatRes.data || []);
      console.log("Seat Options fetched:", seatRes.data);
    } catch (error) {
      console.error("โหลดข้อมูลที่นั่งล้มเหลว:", error);
    }

    try {
      const typeRes = await axios.get(`${config.apiUrl}/table_Types`);
      setTableTypes(typeRes.data || []);
      console.log("Table Types fetched:", typeRes.data);
    } catch (error) {
      console.error("โหลดข้อมูลประเภทโต๊ะล้มเหลว:", error);
    }

    try {
      const gridRes = await axios.get(`${config.apiUrl}/grid_size`);
      setNumRows(gridRes.data.rows);
      setNumCols(gridRes.data.cols);
      setGridRowsInput(String(gridRes.data.rows));
      setGridColsInput(String(gridRes.data.cols));
      console.log("Grid size fetched:", gridRes.data);
    } catch (error) {
      console.error("โหลดข้อมูลขนาดกริดล้มเหลว:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลขนาดกริดได้",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAddSeatOption = async () => {
    const parsedSeats = parseInt(seatOptionInput);
    if (isNaN(parsedSeats) || parsedSeats <= 0) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "กรุณาระบุจำนวนที่นั่งเป็นตัวเลขที่ถูกต้อง",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    try {
      const res = await axios.post(`${config.apiUrl}/add_seat`, {
        seats: parsedSeats,
      });
      if (res.status === 200 || res.status === 201) {
        await fetchAllData();
        setSeatOptionInput("");
        Swal.fire({
          icon: "success",
          title: "เพิ่มจำนวนที่นั่งสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
        setIsAddSeatOptionDialogOpen(true);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มที่นั่งได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleDeleteSeatOption = async (id: string) => {
    try {
      const res = await axios.delete(`${config.apiUrl}/delete_seat/${id}`);
      if (res.status === 200) {
        await fetchAllData();
        Swal.fire({
          icon: "success",
          title: "ลบที่นั่งสำเร็จ",
          showConfirmButton: false,
          timer: 1000,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถลบที่นั่งได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleAddTableType = async () => {
    if (!tableTypeInput.trim()) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "กรุณาระบุชื่อประเภทโต๊ะ",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    try {
      const res = await axios.post(`${config.apiUrl}/add_TableType`, {
        name: tableTypeInput.trim(),
      });
      if (res.status === 200 || res.status === 201) {
        await fetchAllData();
        setTableTypeInput("");
        Swal.fire({
          icon: "success",
          title: "เพิ่มประเภทโต๊ะสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
        setIsAddTableTypeDialogOpen(true);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มประเภทโต๊ะได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleDeleteTableType = async (id: string) => {
    try {
      const res = await axios.delete(`${config.apiUrl}/delete_TablType/${id}`);
      if (res.status === 200) {
        await fetchAllData();
        Swal.fire({
          icon: "success",
          title: "ลบประเภทโต๊ะสำเร็จ",
          showConfirmButton: false,
          timer: 1000,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถลบประเภทโต๊ะได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  // ---------- NEW: หาช่องว่างตัวแรกในกริด (เลี่ยงซ้อน 0,0) ----------
  const getFirstFreeCell = () => {
    const occupied = new Set(tables.map((t) => `${t.x},${t.y}`));
    for (let y = 0; y < numRows; y++) {
      for (let x = 0; x < numCols; x++) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) return { x, y };
      }
    }
    return null; // กริดเต็ม
  };
  // --------------------------------------------------------------------

  const handleAddTable = async () => {
    console.log("newTableName:", newTableName);
    console.log("newTableSeats:", newTableSeats);
    console.log("newTableTypeId (before validation):", newTableTypeId);
    console.log("tableTypes (current state):", tableTypes);
    console.log("newTableAdditionalInfo:", newTableAdditionalInfo);

    if (!newTableName.trim() || !newTableSeats || !newTableTypeId) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณาระบุชื่อโต๊ะ, จำนวนที่นั่ง และประเภทโต๊ะ",
        showConfirmButton: false,
        timer: 1500,
      });
      return false;
    }

    const parsedSeats = parseInt(newTableSeats);
    if (isNaN(parsedSeats) || parsedSeats <= 0) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "จำนวนที่นั่งต้องเป็นตัวเลขที่ถูกต้อง",
        showConfirmButton: false,
        timer: 1500,
      });
      return false;
    }

    // ใช้พิกัดว่างแทนการ fix (0,0)
    const freeCell = getFirstFreeCell();
    if (!freeCell) {
      Swal.fire({
        icon: "warning",
        title: "พื้นที่กริดเต็ม",
        text: "ไม่สามารถเพิ่มโต๊ะใหม่ได้เพราะกริดถูกใช้เต็มแล้ว",
        showConfirmButton: true,
      });
      return false;
    }

    try {
      const res = await axios.post(`${config.apiUrl}/add_table`, {
        name: newTableName.trim(),
        seats: parsedSeats,
        tableTypeId: newTableTypeId,
        additionalInfo: newTableAdditionalInfo.trim(),
        x: freeCell.x,
        y: freeCell.y,
        active: true,
      });

      if (res.status === 200 || res.status === 201) {
        await fetchAllData();
        Swal.fire({
          icon: "success",
          title: "เพิ่มโต๊ะอาหารสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
        setIsAddTableDialogOpen(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("ไม่สามารถเพิ่มโต๊ะอาหารได้:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเพิ่มโต๊ะอาหารได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
      return false;
    }
  };

  const handleEditTable = async () => {
    if (!editingTable) return;

    if (
      !editTableName.trim() ||
      !editTableSeats ||
      !editTableTypeId ||
      editTableSeats === ""
    ) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณาระบุชื่อโต๊ะ, จำนวนที่นั่ง และประเภทโต๊ะ",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    const parsedSeats = parseInt(editTableSeats);
    if (isNaN(parsedSeats) || parsedSeats <= 0) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "จำนวนที่นั่งต้องเป็นตัวเลขที่ถูกต้อง",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    try {
      const res = await axios.put(
        `${config.apiUrl}/update_table/${editingTable.id}`,
        {
          name: editTableName.trim(),
          seats: parsedSeats,
          tableTypeId: editTableTypeId,
          additionalInfo: editTableAdditionalInfo.trim(),
        }
      );

      if (res.status === 200) {
        await fetchAllData();
        Swal.fire({
          icon: "success",
          title: "อัปเดตข้อมูลโต๊ะสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
        setIsEditTableDialogOpen(false);
        setEditingTable(null);
      }
    } catch (error) {
      console.error("ไม่สามารถอัปเดตข้อมูลโต๊ะได้:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถอัปเดตข้อมูลโต๊ะได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  const handleOpenEditTableDialog = useCallback(
    (id: string) => {
      const tableToEdit = tables.find((table) => table.id === id);
      if (tableToEdit) {
        setEditingTable(tableToEdit);
        setEditTableName(tableToEdit.name);
        setEditTableSeats(String(tableToEdit.seats));
        setEditTableTypeId(tableToEdit.tableTypeId);
        setEditTableAdditionalInfo(tableToEdit.additionalInfo || "");
        setIsEditTableDialogOpen(true);
      }
    },
    [tables]
  );

  const handleUpdateGridSize = async () => {
    const parsedRows = parseInt(gridRowsInput);
    const parsedCols = parseInt(gridColsInput);
    if (isNaN(parsedRows) || parsedRows <= 0 || isNaN(parsedCols) || parsedCols <= 0) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "จำนวนแถวและคอลัมน์ต้องเป็นตัวเลขมากกว่า 0",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    try {
      const res = await axios.post(`${config.apiUrl}/add_grid_size`, {
        rows: parsedRows,
        cols: parsedCols,
      });
      if (res.status === 200) {
        setNumRows(parsedRows);
        setNumCols(parsedCols);
        setIsGridSizeDialogOpen(false);
        Swal.fire({
          icon: "success",
          title: "อัปเดตขนาดกริดสำเร็จ",
          text: res.data.message,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error("ไม่สามารถอัปเดตขนาดกริดได้:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถอัปเดตขนาดกริดได้\n" + String(error),
        showConfirmButton: false,
        timer: 1500,
      });
    }
  };

  useEffect(() => {
    if (isAddSeatOptionDialogOpen) {
      setSeatOptionInput("");
    }
    if (isAddTableTypeDialogOpen) {
      setTableTypeInput("");
    }
    if (isAddTableDialogOpen) {
      setNewTableName("");
      setNewTableSeats("");
      setNewTableTypeId("");
      setNewTableAdditionalInfo("");
    }
    if (!isEditTableDialogOpen) {
      setEditingTable(null);
      setEditTableName("");
      setEditTableSeats("");
      setEditTableTypeId("");
      setEditTableAdditionalInfo("");
    }
    if (isGridSizeDialogOpen) {
      setGridRowsInput(String(numRows));
      setGridColsInput(String(numCols));
    }
  }, [
    isAddSeatOptionDialogOpen,
    isAddTableTypeDialogOpen,
    isAddTableDialogOpen,
    isEditTableDialogOpen,
    isGridSizeDialogOpen,
    numRows,
    numCols,
  ]);

  const handleTablePositionChange = useCallback(
    async (id: string, newX: number, newY: number) => {
      setTables((prevTables) => {
        const existingTableAtNewPos = prevTables.find(
          (t) => t.x === newX && t.y === newY && t.id !== id
        );

        if (existingTableAtNewPos) {
          const originalItemTable = prevTables.find((t) => t.id === id);
          if (originalItemTable) {
            return prevTables.map((t) => {
              if (t.id === id) {
                return { ...t, x: newX, y: newY };
              } else if (t.id === existingTableAtNewPos.id) {
                return { ...t, x: originalItemTable.x, y: originalItemTable.y };
              }
              return t;
            });
          }
        } else {
          return prevTables.map((t) =>
            t.id === id ? { ...t, x: newX, y: newY } : t
          );
        }
        return prevTables;
      });

      try {
        await axios.post(`${config.apiUrl}/save_table_positions`, [
          {
            id: id,
            x: newX,
            y: newY,
          },
        ]);
        console.log(`Table ${id} position saved: x=${newX}, y=${newY}`);
      } catch (error) {
        console.error("Error saving table position:", error);
        Swal.fire("ผิดพลาด!", "ไม่สามารถบันทึกตำแหน่งโต๊ะได้", "error");
        fetchAllData();
      }
    },
    [fetchAllData]
  );

  const handleTableToggleActive = useCallback(
    async (id: string, activeStatus: boolean) => {
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, active: activeStatus } : t))
      );
      try {
        await axios.put(`${config.apiUrl}/update_table_status/${id}`, {
          active: activeStatus,
        });
        Swal.fire({
          icon: "success",
          title: "อัปเดตสถานะโต๊ะสําเร็จ",
          showConfirmButton: false,
          timer: 1000,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถอัปเดตสถานะโต๊ะได้\n" + String(error),
          showConfirmButton: false,
          timer: 1500,
        });
        fetchAllData();
      }
    },
    [fetchAllData]
  );

  const handleTableDelete = useCallback(
    async (id: string) => {
      Swal.fire({
        title: "คุณแน่ใจหรือไม่?",
        text: "คุณจะไม่สามารถย้อนกลับได้!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "ใช่, ลบเลย!",
        cancelButtonText: "ยกเลิก",
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await axios.delete(`${config.apiUrl}/delete_table/${id}`);
            setTables((prev) => prev.filter((t) => t.id !== id));
            Swal.fire({
              icon: "success",
              title: "ลบโต๊ะสำเร็จ",
              showConfirmButton: false,
              timer: 1000,
            });
          } catch (error) {
            console.error("Failed to delete table:", error);
            Swal.fire({
              icon: "error",
              title: "เกิดข้อผิดพลาด",
              text: "ไม่สามารถลบโต๊ะได้\n" + String(error),
              showConfirmButton: false,
              timer: 1500,
            });
            fetchAllData();
          }
        }
      });
    },
    [fetchAllData]
  );

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col justify-center items-center min-h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-sky-600 mb-6"></div>
        <p className="text-xl text-gray-700 font-semibold">
          กำลังโหลดข้อมูลโต๊ะ...
        </p>
        <p className="text-sm text-gray-500">กรุณารอสักครู่</p>
      </div>
    );
  }

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-200 pb-3">
          จัดการแผนผังโต๊ะ
        </h1>

        <div className="flex flex-wrap gap-4 items-start">
          <div className="bg-white border rounded-lg p-4 shadow-sm ">
            <div className="flex flex-col items-center justify-center">
              <label className="text-sm text-gray-700 font-medium block mb-1">
                เพิ่มจำนวนที่นั่ง
              </label>
              <Dialog
                open={isAddSeatOptionDialogOpen}
                onOpenChange={setIsAddSeatOptionDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer  rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    title="เพิ่มจำนวนที่นั่ง"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-sm rounded-2xl shadow-xl bg-white">
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold text-blue-700">
                        เพิ่มจำนวนที่นั่ง
                      </DialogTitle>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddSeatOption();
                      }}
                      className="space-y-4 mt-2"
                    >
                      <Input
                        placeholder="จำนวนที่นั่ง เช่น 2, 4, 6"
                        type="number"
                        min={1}
                        value={seatOptionInput}
                        onChange={(e) => setSeatOptionInput(e.target.value)}
                        className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />

                      <DialogFooter className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddSeatOptionDialogOpen(false)}
                          type="button"
                          className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          type="submit"
                          className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                        >
                          บันทึก
                        </Button>
                      </DialogFooter>
                    </form>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {seatOptions.length === 0 ? (
                        <p className="text-sm text-gray-500">ยังไม่มีที่นั่ง</p>
                      ) : (
                        seatOptions.map((s) => (
                          <span
                            key={s.id}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-300 rounded-full text-sm"
                          >
                            {s.seats} ที่นั่ง
                            <button
                              onClick={() => handleDeleteSeatOption(s.id)}
                              className="cursor-pointer text-red-500 hover:text-red-700"
                              title="ลบ"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </motion.div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <label className="text-sm text-gray-700 font-medium block mb-1">
                เพิ่มประเภทโต๊ะ
              </label>
              <Dialog
                open={isAddTableTypeDialogOpen}
                onOpenChange={setIsAddTableTypeDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="cursor-pointer rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    title="เพิ่มประเภทโต๊ะ"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-sm rounded-2xl shadow-xl bg-white">
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold text-blue-700">
                        เพิ่มประเภทโต๊ะ
                      </DialogTitle>
                    </DialogHeader>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTableType();
                      }}
                      className="space-y-4 mt-2"
                    >
                      <Input
                        placeholder="ชื่อประเภทโต๊ะ เช่น กลางแจ้ง, ริมทะเล"
                        value={tableTypeInput}
                        onChange={(e) => setTableTypeInput(e.target.value)}
                        className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />

                      <DialogFooter className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddTableTypeDialogOpen(false)}
                          type="button"
                          className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          type="submit"
                          className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                        >
                          บันทึก
                        </Button>
                      </DialogFooter>
                    </form>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {tableTypes.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          ยังไม่มีประเภทโต๊ะ
                        </p>
                      ) : (
                        tableTypes.map((type) => (
                          <span
                            key={type.id}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-300 rounded-full text-sm"
                          >
                            {type.name}
                            <button
                              onClick={() => handleDeleteTableType(type.id)}
                              className="cursor-pointer text-red-500 hover:text-red-700"
                              title="ลบ"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </motion.div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <label className="text-sm text-gray-700 font-medium block mb-1">
                เพิ่มโต๊ะอาหาร
              </label>
              <Dialog
                open={isAddTableDialogOpen}
                onOpenChange={setIsAddTableDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
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

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTable();
                      }}
                      className="space-y-4 mt-2"
                    >
                      <Input
                        placeholder="ชื่อโต๊ะ (เช่น 01 หรือ A1)"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          จำนวนที่นั่ง
                        </label>
                        <Select
                          value={newTableSeats}
                          onValueChange={(val) => setNewTableSeats(val)}
                        >
                          <SelectTrigger className="w-full border-blue-300 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors">
                            <SelectValue placeholder="เลือกจำนวนที่นั่ง" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-blue-200 rounded-lg shadow-md max-h-48 overflow-auto">
                            {seatOptions.length === 0 ? (
                              <div className="p-2 text-gray-500 text-center">
                                ไม่มีตัวเลือกที่นั่ง
                              </div>
                            ) : (
                              seatOptions.map((option) => (
                                <SelectItem
                                  key={option.id}
                                  value={String(option.seats)}
                                  className="cursor-pointer hover:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-800"
                                >
                                  {option.seats} ที่นั่ง
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ประเภทโต๊ะ
                        </label>
                        <Select
                          onValueChange={(val: string) => {
                            console.log("Selected Table Type ID:", val);
                            setNewTableTypeId(val);
                          }}
                          value={newTableTypeId}
                        >
                          <SelectTrigger className="w-full border-blue-300 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors">
                            <SelectValue placeholder="เลือกประเภทโต๊ะ" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-blue-200 rounded-lg shadow-md max-h-48 overflow-auto">
                            {tableTypes.length === 0 ? (
                              <div className="p-2 text-gray-500 text-center">
                                ไม่มีประเภทโต๊ะ
                              </div>
                            ) : (
                              tableTypes.map((type) => (
                                <SelectItem
                                  key={type.id}
                                  value={String(type.id)}
                                  className="cursor-pointer hover:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-800"
                                >
                                  {type.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ข้อมูลเพิ่มเติม
                        </label>
                        <Textarea
                          placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับโต๊ะ (เช่น โต๊ะริมหน้าต่าง, โต๊ะสำหรับครอบครัว)"
                          value={newTableAdditionalInfo}
                          onChange={(e) =>
                            setNewTableAdditionalInfo(e.target.value)
                          }
                          className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <DialogFooter className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsAddTableDialogOpen(false)}
                          type="button"
                          className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          type="submit"
                          className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                        >
                          บันทึก
                        </Button>
                      </DialogFooter>
                    </form>
                  </motion.div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <label className="text-sm text-gray-700 font-medium block mb-1">
                ตั้งค่าขนาดกริด
              </label>
              <Dialog
                open={isGridSizeDialogOpen}
                onOpenChange={setIsGridSizeDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="cursor-pointer rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    title="ตั้งค่าขนาดกริด"
                  >
                    <Grid className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm rounded-2xl shadow-xl bg-white">
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-lg font-semibold text-blue-700">
                        ตั้งค่าขนาดกริด (แถว x คอลัมน์)
                      </DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateGridSize();
                      }}
                      className="space-y-4 mt-2"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          จำนวนแถว
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={gridRowsInput}
                          onChange={(e) => setGridRowsInput(e.target.value)}
                          className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          จำนวนคอลัมน์
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={gridColsInput}
                          onChange={(e) => setGridColsInput(e.target.value)}
                          className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <DialogFooter className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsGridSizeDialogOpen(false)}
                          type="button"
                          className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          ยกเลิก
                        </Button>
                        <Button
                          type="submit"
                          className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                        >
                          บันทึก
                        </Button>
                      </DialogFooter>
                    </form>
                  </motion.div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {editingTable && (
            <Dialog
              open={isEditTableDialogOpen}
              onOpenChange={setIsEditTableDialogOpen}
            >
              <DialogContent className="max-w-md rounded-2xl shadow-xl bg-white">
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-blue-700">
                      แก้ไขโต๊ะอาหาร: {editingTable.name}
                    </DialogTitle>
                  </DialogHeader>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEditTable();
                    }}
                    className="space-y-4 mt-2"
                  >
                    <Input
                      placeholder="ชื่อโต๊ะ (เช่น 01 หรือ A1)"
                      value={editTableName}
                      onChange={(e) => setEditTableName(e.target.value)}
                      className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        จำนวนที่นั่ง
                      </label>
                      <Select
                        value={editTableSeats}
                        onValueChange={(val) => setEditTableSeats(val)}
                      >
                        <SelectTrigger className="cursor-pointer w-full border-blue-300 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors">
                          <SelectValue placeholder="เลือกจำนวนที่นั่ง" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-blue-200 rounded-lg shadow-md max-h-48 overflow-auto">
                          {seatOptions.length === 0 ? (
                            <div className="p-2 text-gray-500 text-center">
                              ไม่มีตัวเลือกที่นั่ง
                            </div>
                          ) : (
                            seatOptions.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={String(option.seats)}
                                className="cursor-pointer hover:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-800"
                              >
                                {option.seats} ที่นั่ง
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ประเภทโต๊ะ
                      </label>
                      <Select
                        onValueChange={(val: string) => {
                          setEditTableTypeId(val);
                        }}
                        value={editTableTypeId}
                      >
                        <SelectTrigger className="cursor-pointer w-full border-blue-300 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors">
                          <SelectValue placeholder="เลือกประเภทโต๊ะ" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-blue-200 rounded-lg shadow-md max-h-48 overflow-auto">
                          {tableTypes.length === 0 ? (
                            <div className="p-2 text-gray-500 text-center">
                              ไม่มีประเภทโต๊ะ
                            </div>
                          ) : (
                            tableTypes.map((type) => (
                              <SelectItem
                                key={type.id}
                                value={String(type.id)}
                                className="cursor-pointer hover:bg-blue-50 data-[state=checked]:bg-blue-100 data-[state=checked]:text-blue-800"
                              >
                                {type.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ข้อมูลเพิ่มเติม
                      </label>
                      <Textarea
                        placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับโต๊ะ (เช่น โต๊ะริมหน้าต่าง, โต๊ะสำหรับครอบครัว)"
                        value={editTableAdditionalInfo}
                        onChange={(e) =>
                          setEditTableAdditionalInfo(e.target.value)
                        }
                        className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <DialogFooter className="flex justify-end gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditTableDialogOpen(false)}
                        type="button"
                        className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        type="submit"
                        className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                      >
                        บันทึกการแก้ไข
                      </Button>
                    </DialogFooter>
                  </form>
                </motion.div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative w-full min-h-[600px] border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-auto">
          <TableCanvas
            tables={tables}
            onTablePositionChange={handleTablePositionChange}
            onTableToggleActive={handleTableToggleActive}
            onTableDelete={handleTableDelete}
            onTableEdit={handleOpenEditTableDialog}
            numRows={numRows}
            numCols={numCols}
          />
        </div>
      </div>
    </DndProvider>
  );
}
