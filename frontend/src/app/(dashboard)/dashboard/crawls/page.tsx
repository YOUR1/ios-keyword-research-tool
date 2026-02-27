"use client";

import { useState } from "react";
import Link from "next/link";
import { useCrawlJobs } from "@/hooks/useCrawlJobs";
import CrawlStatusBadge from "@/components/dashboard/CrawlStatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function CrawlsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error } = useCrawlJobs({
    page,
    page_size: 20,
    status: statusFilter || undefined,
  });

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-red-600 dark:text-red-400">
        Failed to load crawl history. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Crawl History
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Track the status and results of all your crawl jobs.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {data && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-auto">
            {data.total} job{data.total !== 1 ? "s" : ""} total
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Apps Found
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    New Apps
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Duration
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                    Started
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {data.items.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      <Link
                        href={`/dashboard/crawls/${job.id}`}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {job.keyword_term || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <CrawlStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300">
                      {job.apps_found}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300 hidden sm:table-cell">
                      {job.apps_new}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                      {job.duration_seconds !== null
                        ? `${job.duration_seconds.toFixed(1)}s`
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">
                      {job.started_at
                        ? new Date(job.started_at).toLocaleString()
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">
                      {job.completed_at
                        ? new Date(job.completed_at).toLocaleString()
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Error messages for failed jobs */}
          {data.items.some((j) => j.status === "failed" && j.error_message) && (
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              {data.items
                .filter((j) => j.status === "failed" && j.error_message)
                .map((j) => (
                  <div
                    key={j.id}
                    className="text-xs text-red-500 dark:text-red-400 py-1"
                  >
                    Job #{j.id}: {j.error_message}
                  </div>
                ))}
            </div>
          )}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Page {data.page} of {data.total_pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.total_pages}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No crawl jobs"
          message={
            statusFilter
              ? `No ${statusFilter} crawl jobs found.`
              : "No crawl jobs have been run yet. Add keywords and trigger crawls to see activity here."
          }
        />
      )}
    </div>
  );
}
