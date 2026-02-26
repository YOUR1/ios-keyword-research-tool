import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  trend: "up" | "down" | "stable";
  size?: "sm" | "md";
  className?: string;
}

const sizeMap = {
  sm: "size-3",
  md: "size-4",
};

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    label: "Trending up",
  },
  down: {
    icon: TrendingDown,
    color: "text-red-600 dark:text-red-400",
    label: "Trending down",
  },
  stable: {
    icon: Minus,
    color: "text-zinc-400 dark:text-zinc-500",
    label: "Stable",
  },
};

export function TrendIndicator({
  trend,
  size = "md",
  className,
}: TrendIndicatorProps) {
  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={config.label}
      title={config.label}
    >
      <Icon className={cn(sizeMap[size], config.color)} strokeWidth={2} />
    </span>
  );
}
