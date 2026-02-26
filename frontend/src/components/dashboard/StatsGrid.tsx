"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  highlight?: boolean;
}

interface StatsGridProps {
  stats: StatItem[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
                {stat.trend && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {stat.trend}
                  </p>
                )}
              </div>
              {stat.icon && (
                <div className={`p-2 rounded-lg ring-1 ring-inset ${
                  stat.highlight
                    ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20 dark:ring-emerald-500/30"
                    : "bg-zinc-100 text-zinc-400 ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10"
                }`}>
                  {stat.icon}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
