"use client";

import { useDrag } from "react-dnd";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const CustomSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      props.checked ? "bg-green-500" : "bg-gray-300",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
));
CustomSwitch.displayName = SwitchPrimitives.Root.displayName;

type Table = {
  id: string;
  x: number;
  y: number;
  active: boolean;
  name: string;
  seats: number;
  tableTypeName: string;
  additionalInfo: string;
};

interface TableCardProps {
  table: Table;
  onSwitch?: () => void;
  onEdit?: (tableId: string) => void;
}

export function TableCard({ table, onSwitch, onEdit }: TableCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TABLE_CARD",
    item: table,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onEdit) {
      onEdit(table.id);
    }
  };

  return (
    <div
      ref={drag}
      className="absolute"
      style={{ left: table.x, top: table.y, opacity: isDragging ? 0.5 : 1 }}
    >
      <Card
        className={`w-[80px] h-[80px] p-1 shadow-md flex flex-col justify-start gap-1 relative overflow-hidden ${
          table.active ? "bg-white" : "bg-gray-200 opacity-60"
        } cursor-move`}
      >
        <div className="flex justify-between items-center w-full">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer !h-5 !w-5 !p-0"
            onClick={handleEditClick}
          >
            <PencilIcon className="w-3 h-3 text-gray-500 hover:text-blue-600" />
          </Button>

          {onSwitch && (
            <CustomSwitch
              checked={table.active}
              onCheckedChange={onSwitch}
              className="h-5 w-10 scale-75"
            />
          )}
        </div>

        <div className="flex flex-col items-center justify-start flex-1 gap-0.5 text-center px-1 min-w-0">
          <p
            className="text-sm font-bold text-gray-800 leading-tight w-full truncate"
            title={table.name}
          >
            {table.name}
          </p>
          <p className="text-xs text-gray-600 leading-tight">
            {table.seats} ที่
          </p>
          <p
            className="text-[10px] text-gray-500 leading-tight w-full truncate"
            title={table.tableTypeName}
          >
            {table.tableTypeName}
          </p>
          {/* {table.additionalInfo && (
            <p
              className="text-[10px] text-gray-500 leading-tight w-full overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
              title={table.additionalInfo}
            >
              {table.additionalInfo}
            </p>
          )} */}
        </div>
      </Card>
    </div>
  );
}
