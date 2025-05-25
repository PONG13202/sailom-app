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
      <Input
        placeholder="ค้นหาผู้ใช้..."
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="max-w-sm"
      />
      <div className="relative rounded-xl border shadow overflow-x-auto responsive-table">
        {/* Scroll shadow cues for mobile */}
        <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-gray-200 to-transparent pointer-events-none z-10 sm:hidden" />
        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-gray-200 to-transparent pointer-events-none z-10 sm:hidden" />
        <Table className="min-w-full"><TableHeader className="sticky top-0 bg-white z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();

                return (
                  <TableHead
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    className={`bg-gray-50 ${canSort ? 'cursor-pointer select-none' : ''}`}
                    title={canSort ? 'คลิกเพื่อเรียงลำดับ' : undefined}
                    aria-sort={
                      sortDirection === 'asc'
                        ? 'ascending'
                        : sortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sortDirection === 'asc' ? (
                      <FaSortUp className="inline ml-1" />
                    ) : sortDirection === 'desc' ? (
                      <FaSortDown className="inline ml-1" />
                    ) : null}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader><TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody></Table>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          ก่อนหน้า
        </Button>
        <div>
          หน้า {table.getState().pagination.pageIndex + 1} จาก{' '}
          {table.getPageCount()}
        </div>
        <Button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          ถัดไป
        </Button>
      </div>
    </div>
  );
}