"use client";
// sailom\app\components\ui\Datable.tsx

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"; // ตรวจสอบ path ให้ถูกต้อง
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa"; // เพิ่ม FaSort
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  RowData,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";

// (Optional but recommended) เพิ่มการประกาศ module สำหรับ meta property ใน ColumnDef
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerLabel?: string; // Label ที่จะแสดงใน mobile card view
    cellClassName?: string; // Custom class for cell content in both views
    headerClassName?: string; // Custom class for header in desktop view
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialPageSize?: number;
  defaultSortColumnId?: string;
  searchPlaceholder?: string;
  noDataMessage?: string;
  onRowClick?: (row: TData) => void; // Optional: callback for row click
}

export function DataTable<TData, TValue>({
  columns,
  data,
  initialPageSize = 10,
  defaultSortColumnId,
  searchPlaceholder = "ค้นหา...",
  noDataMessage = "ไม่พบข้อมูลที่ตรงกัน",
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [filter, setFilter] = React.useState("");

  // Initialize sorting state more robustly
  const initialSort = React.useMemo<SortingState>(() => {
    if (defaultSortColumnId) {
      const colExists = columns.some(col => col.id === defaultSortColumnId || (col as any).accessorKey === defaultSortColumnId);
      if (colExists) return [{ id: defaultSortColumnId, desc: false }];
    }
    // Fallback to the first sortable column or no sort
    const firstSortableColumn = columns.find(col => col.enableSorting !== false);
    if (firstSortableColumn) {
      return [{ id: firstSortableColumn.id || (firstSortableColumn as any).accessorKey, desc: false }];
    }
    return [];
  }, [columns, defaultSortColumnId]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSort);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: filter,
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // enableSortingRemoval: false, // ถ้าไม่ต้องการให้ยกเลิกการ sort เมื่อคลิกครั้งที่ 3
    meta: { // สามารถส่ง meta ไปยัง table instance ได้ หากต้องการใช้ใน custom renderers
        onRowClick
    }
  });

  const { rows } = table.getRowModel();
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-4 w-full">
      {/* Search Input */}
      <div className="flex">
        <Input
          placeholder={searchPlaceholder}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full sm:max-w-xs md:max-w-sm text-base px-4 py-2 border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 shadow-sm transition-colors duration-200 ease-in-out"
          aria-label="Search table data"
        />
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-md overflow-hidden"> {/* Modern shadow & background */}
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-muted/50">{/* ลบ newline/space ตรงนี้ */}
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-gray-200">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    const columnMeta = header.column.columnDef.meta as ColumnMeta<TData, TValue> | undefined;

                    return (
                      <TableHead
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={`
                          py-3 px-4 text-left text-sm font-semibold text-muted-foreground
                          ${columnMeta?.headerClassName || ""}
                          ${canSort ? "cursor-pointer select-none hover:bg-muted transition-colors" : ""}
                        `}
                        title={
                          canSort
                            ? `เรียงตาม ${flexRender(header.column.columnDef.header, header.getContext())} (${sortDirection === "asc" ? "น้อยไปมาก" : sortDirection === "desc" ? "มากไปน้อย" : "คลิกเพื่อเรียง"})`
                            : undefined
                        }
                        aria-sort={
                          sortDirection === "asc"
                            ? "ascending"
                            : sortDirection === "desc"
                            ? "descending"
                            : "none"
                        }
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            sortDirection === "asc" ? (
                              <FaSortUp className="h-4 w-4 text-sky-600" />
                            ) : sortDirection === "desc" ? (
                              <FaSortDown className="h-4 w-4 text-sky-600" />
                            ) : (
                              <FaSort className="h-4 w-4 text-gray-400 opacity-50 group-hover:opacity-100" />
                            )
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`border-b border-gray-200 last:border-b-0 hover:bg-muted/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                       const cellMeta = cell.column.columnDef.meta as ColumnMeta<TData, TValue> | undefined;
                      return (
                        <TableCell key={cell.id} className={`py-3 px-4 text-sm text-gray-700 ${cellMeta?.cellClassName || ""}`}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-lg text-muted-foreground"
                  >
                    {noDataMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {rows.length > 0 ? (
            rows.map((row) => (
              <div
                key={row.id}
                className={`border-b p-4 space-y-3 last:border-b-0 bg-card hover:bg-muted/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => {
                  const columnDef = cell.column.columnDef;
                  const meta = columnDef.meta as ColumnMeta<TData, TValue> | undefined;
                  const headerContent = typeof columnDef.header === "function"
                                        ? flexRender(columnDef.header, cell.getContext())
                                        : columnDef.header;

                  const headerLabel = meta?.headerLabel || (typeof headerContent === 'string' ? headerContent : columnDef.id || "ข้อมูล");

                   // Don't render if header is explicitly null or not defined and no meta.headerLabel
                  if (headerContent === null || (headerContent === undefined && !meta?.headerLabel)) {
                    return null;
                  }


                  return (
                    <div
                      key={cell.id}
                      className="flex justify-between items-start gap-2"
                    >
                      <span className="font-medium text-sm text-muted-foreground flex-shrink-0">
                        {headerLabel}:
                      </span>
                      <div className={`text-sm text-right flex-1 min-w-0 ${meta?.cellClassName || ""}`}>
                        {flexRender(
                          columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
             <div className="p-8 text-center text-lg text-muted-foreground">
                {noDataMessage}
             </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            หน้า {currentPage} จาก {pageCount} (ทั้งหมด {table.getFilteredRowModel().rows.length} รายการ)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5"
            >
              หน้าแรก
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5"
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5"
            >
              ถัดไป
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5"
            >
              หน้าสุดท้าย
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
