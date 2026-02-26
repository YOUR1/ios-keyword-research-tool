"use client";

import { useCallback } from "react";
import Filters from "@/components/Filters";
import AppTable from "@/components/AppTable";
import AppTableSkeleton from "@/components/AppTableSkeleton";
import { useApps } from "@/hooks/useApps";
import { AppFilters, PaginatedApps, Category, Country } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface HomeClientProps {
  initialApps: PaginatedApps;
  categories: Category[];
  countries: Country[];
}

export default function HomeClient({
  initialApps,
  categories: initialCategories,
  countries: initialCountries,
}: HomeClientProps) {
  const {
    filters,
    data,
    loading,
    error,
    categories,
    countries,
    fetchApps,
  } = useApps({
    apps: initialApps,
    categories: initialCategories,
    countries: initialCountries,
  });

  const handleFilterChange = useCallback(
    (newFilters: Partial<AppFilters>) => {
      fetchApps(newFilters);
    },
    [fetchApps]
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 dark:bg-zinc-800/50 dark:ring-1 dark:ring-inset dark:ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-zinc-900/50 dark:from-emerald-500/10 dark:to-transparent" />
        <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            The Bottom of the App Store
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Every app ranked by Bayesian weighted rating. Filter by country,
            category, and minimum review count to find the truly worst-rated apps.
          </p>
          {data && (
            <div className="mt-8 flex items-center justify-center gap-8 sm:gap-12">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-emerald-400">
                  {data.total.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-zinc-400">Apps Indexed</p>
              </div>
              <div className="h-12 w-px bg-zinc-700" />
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-emerald-400">
                  {data.total_pages}
                </p>
                <p className="mt-1 text-sm text-zinc-400">Pages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <Card className="ring-1 ring-inset ring-zinc-900/5 dark:ring-white/10">
        <CardContent className="pt-6">
          <Filters
            filters={filters}
            categories={categories}
            countries={countries}
            onFilterChange={handleFilterChange}
          />
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && <AppTableSkeleton />}

      {/* Error State */}
      {error && (
        <Card className="ring-1 ring-inset ring-red-500/20 bg-red-50 dark:bg-red-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {!loading && data && (
        <Card className="ring-1 ring-inset ring-zinc-900/5 dark:ring-white/10 overflow-hidden p-0">
          <AppTable
            data={data}
            onPageChange={(page) => handleFilterChange({ page })}
          />
        </Card>
      )}
    </div>
  );
}
