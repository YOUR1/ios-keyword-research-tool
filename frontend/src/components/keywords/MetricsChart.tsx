"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MetricsHistoryItem } from "@/types";

interface MetricsChartProps {
  data: MetricsHistoryItem[];
  className?: string;
}

export default function MetricsChart({ data, className = "" }: MetricsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Metrics History
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
          No historical data yet. Analyze the keyword multiple times to see trends.
        </p>
      </div>
    );
  }

  // Data is already sorted by date ascending from API
  const chartData = data.map((item) => ({
    date: item.snapshot_date,
    popularity: item.popularity_score,
    difficulty: item.difficulty_score,
    opportunity: item.opportunity_score,
  }));

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Metrics History
      </h3>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-zinc-300 dark:stroke-zinc-700"
              opacity={0.3}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="fill-zinc-500"
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="fill-zinc-500"
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover, #1f2937)",
                border: "1px solid var(--border, #374151)",
                borderRadius: "8px",
                color: "var(--popover-foreground, #f3f4f6)",
              }}
              formatter={(value: number, name: string) => [
                value?.toFixed(1),
                name === "popularity"
                  ? "Popularity"
                  : name === "difficulty"
                  ? "Difficulty"
                  : "Opportunity",
              ]}
              labelFormatter={(label) => {
                const d = new Date(label);
                return d.toLocaleDateString();
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="popularity"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Popularity"
            />
            <Line
              type="monotone"
              dataKey="difficulty"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Difficulty"
            />
            <Line
              type="monotone"
              dataKey="opportunity"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Opportunity"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span>Popularity - Search demand & engagement</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-red-500 rounded" />
            <span>Difficulty - Competition level</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-green-500 rounded" />
            <span>Opportunity - Potential for success</span>
          </div>
        </div>
      </div>
    </div>
  );
}
