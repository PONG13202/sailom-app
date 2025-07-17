// components/Toolbar.tsx
"use client";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTableDialog } from "./AddTableDialog";

export function Toolbar({
  onAdd,
  onReset,
}: {
  onAdd: (data: any) => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex gap-2">
      <AddTableDialog onAdd={onAdd} />
      {onReset && (
        <Button variant="outline" onClick={onReset}>
          <RefreshCcw className="w-4 h-4 mr-2" /> รีเซ็ต
        </Button>
      )}
    </div>
  );
}
