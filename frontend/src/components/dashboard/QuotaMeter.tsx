"use client";

import { UsageInfo } from "@/types";
import { isUnlimited, formatLimit } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface QuotaMeterProps {
  usage: UsageInfo;
}

function ProgressBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = isUnlimited(limit);
  const pct = unlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor = unlimited
    ? "bg-emerald-500/50"
    : pct >= 90
    ? "bg-red-500"
    : pct >= 70
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-zinc-900 dark:text-white">
          {label}
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {used.toLocaleString()} / {formatLimit(limit)}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-1 ring-inset ring-zinc-900/5 dark:ring-white/5">
        {unlimited ? (
          <div className="h-2 rounded-full bg-emerald-500/30 w-full" />
        ) : (
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export default function QuotaMeter({ usage }: QuotaMeterProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Usage Quota</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <ProgressBar
          label="Keywords"
          used={usage.keywords_used}
          limit={usage.keywords_limit}
        />
        <ProgressBar
          label="Crawls Today"
          used={usage.crawls_today}
          limit={usage.crawls_limit}
        />
        <ProgressBar
          label="Results Stored"
          used={usage.results_stored}
          limit={usage.results_limit}
        />
      </CardContent>
    </Card>
  );
}
