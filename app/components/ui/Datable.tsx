'use client';
// sailom\app\components\ui\Datable.tsx

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import React from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [filter, setFilter] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: filter,
      sorting,
    },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Search Input - Responsive */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Input
          placeholder="ค้นหาผู้ใช้..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full sm:max-w-sm"
        />
      </div>

      {/* Table Container - Responsive */}
      <div className="rounded-xl border shadow">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();

                    return (
                      <TableHead
                        key={`${header.id}-${index}`} // Ensure unique key
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={canSort ? 'cursor-pointer select-none' : ''}
                        title={canSort ? 'คลิกเพื่อเรียงลำดับ' : undefined}
                        aria-sort={
                          sortDirection === 'asc'
                            ? 'ascending'
                            : sortDirection === 'desc'
                            ? 'descending'
                            : 'none'
                        }
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection === 'asc' ? (
                            <FaSortUp className="text-xs" />
                          ) : sortDirection === 'desc' ? (
                            <FaSortDown className="text-xs" />
                          ) : null}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {table.getRowModel().rows.map((row) => (
            <div key={row.id} className="border-b p-4 space-y-3">
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header;
                return (
                  <div key={cell.id} className="flex justify-between items-start">
                    <span className="font-medium text-sm text-muted-foreground min-w-0 flex-shrink-0 mr-3">
                      {typeof header === 'string' ? header : 'Field'}:
                    </span>
                    <div className="text-sm text-right flex-1 min-w-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* No Data Message */}
        {table.getRowModel().rows.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            ไม่พบข้อมูล
          </div>
        )}
      </div>

      {/* Pagination - Responsive */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="w-full sm:w-auto"
          size="sm"
        >
          ก่อนหน้า
        </Button>
        <div className="text-sm text-center">
          หน้า {table.getState().pagination.pageIndex + 1} จาก{' '}
          {table.getPageCount()}
        </div>
        <Button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="w-full sm:w-auto"
          size="sm"
        >
          ถัดไป
        </Button>
      </div>
    </div>
  );
}