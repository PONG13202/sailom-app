import { useDrag } from "react-dnd";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Table = {
  id: string;
  x: number;
  y: number;
  active: boolean;
};

export function TableCard({
  table,
  onSwitch,
}: {
  table: Table;
  onSwitch?: () => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TABLE_CARD",
    item: table,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className="absolute"
      style={{ left: table.x, top: table.y, opacity: isDragging ? 0.5 : 1 }}
    >
      <Card
        className={`w-[80px] h-[80px] p-2 shadow-md flex flex-col justify-between ${
          table.active ? "bg-white" : "bg-gray-200 opacity-60"
        } cursor-move`}
      >
        <div className="text-xs text-gray-500">Table - {table.id}</div>
        <div className="text-sm font-semibold">โต๊ะ {table.id}</div>
        <div className="text-xs">4 ที่นั่ง</div>
        <Switch
          checked={table.active}
          onCheckedChange={onSwitch}
          className="mt-1"
        />
      </Card>
    </div>
  );
}
