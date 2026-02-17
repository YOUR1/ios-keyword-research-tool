"use client";

import React from "react";

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-700"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
              </p>
              {stat.trend && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {stat.trend}
                </p>
              )}
            </div>
            {stat.icon && (
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
