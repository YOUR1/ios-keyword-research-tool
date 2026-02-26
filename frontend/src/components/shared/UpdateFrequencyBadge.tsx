import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UpdateFrequencyBadgeProps {
  daysSinceUpdate: number | null;
  className?: string;
}

function getFrequencyStatus(days: number | null): {
  variant: "success" | "warning" | "destructive" | "secondary";
  label: string;
} {
  if (days === null) {
    return { variant: "secondary", label: "Unknown" };
  }

  if (days < 30) {
    return { variant: "success", label: "Active" };
  } else if (days <= 90) {
    return { variant: "warning", label: "Moderate" };
  } else {
    return { variant: "destructive", label: "Stale" };
  }
}

export function UpdateFrequencyBadge({
  daysSinceUpdate,
  className,
}: UpdateFrequencyBadgeProps) {
  const { variant, label } = getFrequencyStatus(daysSinceUpdate);

  const displayText =
    daysSinceUpdate !== null
      ? `${label} (${daysSinceUpdate}d)`
      : label;

  return (
    <Badge
      variant={variant}
      className={cn("font-medium", className)}
      title={
        daysSinceUpdate !== null
          ? `Last updated ${daysSinceUpdate} days ago`
          : "Update frequency unknown"
      }
    >
      {displayText}
    </Badge>
  );
}
