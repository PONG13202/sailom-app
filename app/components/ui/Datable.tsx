"use client";
// sailom\app\components\ui\Datable.tsx

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
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
  FilterFn,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";

/* -------------------- Column Meta (extend TanStack) -------------------- */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerLabel?: string;     // Label สำหรับ mobile card view
    cellClassName?: string;   // custom class ของ cell
    headerClassName?: string; // custom class ของ header
    excludeFromSearch?: boolean; // column ที่ไม่เอาไป search
  }
}

// helper type สำหรับ ColumnDef ที่มี meta
export type ColumnMeta<TData, TValue> = {
  headerLabel?: string;
  cellClassName?: string;
  headerClassName?: string;
  excludeFromSearch?: boolean;
};

export type ColumnDefWithMeta<TData, TValue> = ColumnDef<TData, TValue> & {
  meta?: ColumnMeta<TData, TValue>;
};


/* -------------------- DataTable Props -------------------- */
interface DataTableProps<TData, TValue> {
  columns: ColumnDefWithMeta<TData, TValue>[];
  data: TData[];
  initialPageSize?: number;
  defaultSortColumnId?: string;
  searchPlaceholder?: string;
  noDataMessage?: string;
  onRowClick?: (row: TData) => void;
}

/* -------------------- Component -------------------- */
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

  /* ---------- Sorting ---------- */
  const initialSort = React.useMemo<SortingState>(() => {
    if (defaultSortColumnId) {
      const colExists = columns.some(
        (col) =>
          col.id === defaultSortColumnId ||
          (col as any).accessorKey === defaultSortColumnId
      );
      if (colExists) return [{ id: defaultSortColumnId, desc: false }];
    }
    const firstSortableColumn = columns.find(
      (col) => col.enableSorting !== false
    );
    if (firstSortableColumn) {
      return [
        {
          id:
            firstSortableColumn.id ||
            (firstSortableColumn as any).accessorKey,
          desc: false,
        },
      ];
    }
    return [];
  }, [columns, defaultSortColumnId]);

  const [sorting, setSorting] = React.useState<SortingState>(initialSort);

  /* ---------- Custom Global Filter ---------- */
  const customGlobalFilterFn: FilterFn<TData> = (row, columnId, filterValue) => {
    if (!filterValue) return true;
    const lowerCaseFilter = String(filterValue).toLowerCase();

    for (const column of row.getVisibleCells()) {
      const columnMeta = column.column.columnDef.meta;
      if (columnMeta?.excludeFromSearch) continue;

      const cellValue = String(column.getValue() ?? "").toLowerCase();
      if (cellValue.includes(lowerCaseFilter)) return true;
    }
    return false;
  };

  /* ---------- Table Instance ---------- */
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: filter,
      sorting,
    },
    initialState: {
      pagination: { pageSize: initialPageSize },
    },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: customGlobalFilterFn,
    meta: { onRowClick },
  });

  const { rows } = table.getRowModel();
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  /* ---------- Pagination Helper ---------- */
  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const maxPagesToShow = 5;
    const leftOffset = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, currentPage - leftOffset);
    let endPage = Math.min(pageCount, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    if (startPage > 1) {
      pageNumbers.push(1);
      if (startPage > 2) pageNumbers.push("...");
    }
    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    if (endPage < pageCount) {
      if (endPage < pageCount - 1) pageNumbers.push("...");
      pageNumbers.push(pageCount);
    }
    return pageNumbers;
  };

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-4 w-full">
      {/* Search Input */}
      <div className="flex">
        <Input
          placeholder={searchPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full sm:max-w-xs md:max-w-sm text-base px-4 py-2 border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 shadow-sm transition-colors"
          aria-label="Search table data"
        />
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-md overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-full ">
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="border-b border-gray-200">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    const meta = header.column.columnDef.meta;

                    return (
                      <TableHead
                        key={header.id}
                        onClick={
                          canSort ? header.column.getToggleSortingHandler() : undefined
                        }
                        className={`
                          py-3 px-4 text-sm font-semibold text-muted-foreground
                          ${meta?.headerClassName || ""}
                          ${
                            canSort
                              ? "cursor-pointer select-none hover:bg-muted transition-colors"
                              : ""
                          }
                          border-r border-gray-200 last:border-r-0
                        `}
                        aria-sort={
                          sortDirection === "asc"
                            ? "ascending"
                            : sortDirection === "desc"
                            ? "descending"
                            : "none"
                        }
                      >
                        <div className="flex items-center gap-2 justify-center">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort &&
                            (sortDirection === "asc" ? (
                              <FaSortUp className="h-4 w-4 text-sky-600" />
                            ) : sortDirection === "desc" ? (
                              <FaSortDown className="h-4 w-4 text-sky-600" />
                            ) : (
                              <FaSort className="h-4 w-4 text-gray-400 opacity-50" />
                            ))}
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
                    className={`border-b border-gray-200 last:border-b-0 hover:bg-muted/30 transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <TableCell
                          key={cell.id}
                          className={`
                            py-3 px-4 text-sm text-gray-700
                            ${meta?.cellClassName || ""}
                            border-r border-gray-200 last:border-r-0
                          `}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                className={`border-b p-4 space-y-3 last:border-b-0 bg-card hover:bg-muted/30 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => {
                  const colDef = cell.column.columnDef;
                  const meta = colDef.meta;
                const headerContent =
  typeof colDef.header === "function"
    ? flexRender(colDef.header, {} as any) // 🚑 cast dummy context (ไม่ใช้จริง)
    : colDef.header;
                  const headerLabel =
                    meta?.headerLabel ||
                    (typeof headerContent === "string"
                      ? headerContent
                      : colDef.id || "ข้อมูล");

                  if (
                    headerContent === null ||
                    (headerContent === undefined && !meta?.headerLabel)
                  ) {
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
                      <div
                        className={`text-sm text-right flex-1 min-w-0 ${
                          meta?.cellClassName || ""
                        }`}
                      >
                        {flexRender(colDef.cell, cell.getContext())}
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
            หน้า {currentPage} จาก {pageCount} (ทั้งหมด{" "}
            {table.getFilteredRowModel().rows.length} รายการ)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              หน้าแรก
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ก่อนหน้า
            </Button>
            {getPageNumbers().map((page, i) => (
              <Button
                key={i}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  typeof page === "number" && table.setPageIndex(page - 1)
                }
                disabled={typeof page !== "number"}
                className={page === currentPage ? "bg-blue-600 text-white" : "text-blue-600"}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ถัดไป
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
            >
              หน้าสุดท้าย
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
