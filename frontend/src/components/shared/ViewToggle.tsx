import * as React from "react";
import { LayoutGrid, Table } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "table" | "grid";
  onChange: (view: "table" | "grid") => void;
  className?: string;
}

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800",
        className
      )}
      role="group"
      aria-label="View toggle"
    >
      <button
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-all",
          view === "table"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        )}
        aria-label="Table view"
        aria-pressed={view === "table"}
      >
        <Table className="size-4 mr-1.5" strokeWidth={2} />
        Table
      </button>
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-all",
          view === "grid"
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        )}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
      >
        <LayoutGrid className="size-4 mr-1.5" strokeWidth={2} />
        Grid
      </button>
    </div>
  );
}
