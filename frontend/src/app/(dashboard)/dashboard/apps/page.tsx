"use client";

import { useState } from "react";
import { useAppIndex } from "@/hooks/useAppIndex";
import AppIndexFilters from "@/components/app-index/AppIndexFilters";
import AppIndexTable from "@/components/app-index/AppIndexTable";
import AppIndexCard from "@/components/app-index/AppIndexCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AppIndexPage() {
  const [view, setView] = useState<"table" | "grid">("table");
  const { filters, data, loading, error, categories, countries, updateFilters } = useAppIndex();

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">App Index</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Browse and analyze all tracked apps with insights.
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-red-600 dark:text-red-400">
          Failed to load apps. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">App Index</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Browse and analyze all tracked apps with insights.
        </p>
      </div>

      {/* Filters */}
      <AppIndexFilters
        filters={filters}
        categories={categories}
        countries={countries}
        onFilterChange={updateFilters}
      />

      {/* Stats Summary & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {data ? (
            <>
              Showing{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {((data.page - 1) * data.page_size + 1).toLocaleString()}
              </span>
              {" - "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {Math.min(data.page * data.page_size, data.total).toLocaleString()}
              </span>
              {" of "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {data.total.toLocaleString()}
              </span>
              {" apps"}
            </>
          ) : (
            <span>Loading...</span>
          )}
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          {/* Table View */}
          {view === "table" ? (
            <AppIndexTable data={data} />
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.items.map((app) => (
                <AppIndexCard key={app.id} app={app} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-900/5 pt-6 dark:border-white/5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {((data.page - 1) * data.page_size + 1).toLocaleString()}
                </span>
                {" - "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {Math.min(data.page * data.page_size, data.total).toLocaleString()}
                </span>
                {" of "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {data.total.toLocaleString()}
                </span>
                {" apps"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md tabular-nums">
                    {data.page}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    of {data.total_pages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.total_pages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No apps found"
          message={
            filters.search ||
            filters.country ||
            filters.category ||
            filters.min_reviews > 0 ||
            filters.max_rating !== null ||
            filters.min_rating !== null ||
            filters.price_filter !== "all" ||
            filters.min_opportunity !== null
              ? "No apps match your current filters. Try adjusting your criteria."
              : "No apps have been discovered yet. Add keywords and run crawls to see apps here."
          }
        />
      )}
    </div>
  );
}
