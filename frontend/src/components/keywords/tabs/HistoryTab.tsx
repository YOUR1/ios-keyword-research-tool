"use client";

import { useState } from "react";
import { useKeywordMetricsHistory } from "@/hooks/useKeywordResearch";
import MetricsChart from "../MetricsChart";

interface HistoryTabProps {
  keywordId: number;
}

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

export default function HistoryTab({ keywordId }: HistoryTabProps) {
  const [selectedDays, setSelectedDays] = useState(30);
  const { data, isLoading } = useKeywordMetricsHistory(keywordId, selectedDays);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Metrics History
        </h3>
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setSelectedDays(range.days)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedDays === range.days
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading history data...</span>
            </div>
          </div>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No historical data available for the last {selectedDays} days.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Analyze this keyword multiple times to see trends over time.
            </p>
          </div>
        </div>
      ) : (
        <MetricsChart data={data.items} />
      )}
    </div>
  );
}
