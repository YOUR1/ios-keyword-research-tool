"use client";

import { UsageInfo } from "@/types";

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
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color =
    pct >= 90
      ? "bg-red-500"
      : pct >= 70
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QuotaMeter({ usage }: QuotaMeterProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-4">
        Usage Quota
      </h3>
      <div className="space-y-4">
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
      </div>
    </div>
  );
}
