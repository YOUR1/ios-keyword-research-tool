import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OpportunityScoreBadgeProps {
  score: number;
  className?: string;
}

function getScoreVariant(score: number): {
  variant: "success" | "warning" | "destructive";
  label: string;
} {
  if (score >= 70) {
    return { variant: "success", label: "High" };
  } else if (score >= 40) {
    return { variant: "warning", label: "Medium" };
  } else {
    return { variant: "destructive", label: "Low" };
  }
}

export function OpportunityScoreBadge({
  score,
  className,
}: OpportunityScoreBadgeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const { variant, label } = getScoreVariant(clampedScore);

  return (
    <Badge
      variant={variant}
      className={cn("font-semibold tabular-nums", className)}
      title={`${label} opportunity (${clampedScore}/100)`}
    >
      {clampedScore}
    </Badge>
  );
}
