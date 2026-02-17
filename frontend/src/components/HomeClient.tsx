"use client";

import { useCallback } from "react";
import Filters from "@/components/Filters";
import AppTable from "@/components/AppTable";
import AppTableSkeleton from "@/components/AppTableSkeleton";
import { useApps } from "@/hooks/useApps";
import { AppFilters, PaginatedApps, Category, Country } from "@/types";

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
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          The Bottom of the App Store
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Every app ranked by Bayesian weighted rating. Filter by country,
          category, and minimum review count to find the truly worst-rated apps.
        </p>
        {data && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{data.total.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">Apps Indexed</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <Filters
        filters={filters}
        categories={categories}
        countries={countries}
        onFilterChange={handleFilterChange}
      />

      {/* Loading / Error / Table */}
      {loading && <AppTableSkeleton />}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && data && (
        <AppTable
          data={data}
          onPageChange={(page) => handleFilterChange({ page })}
        />
      )}
    </div>
  );
}
