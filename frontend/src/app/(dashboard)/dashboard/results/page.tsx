"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useResults } from "@/hooks/useResults";
import { authFetch } from "@/lib/auth-api";
import { Category, Country, SortField } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "lowest_weighted", label: "Lowest Weighted Score" },
  { value: "lowest_rating", label: "Lowest Rating" },
  { value: "highest_rating", label: "Highest Rating" },
  { value: "most_reviews", label: "Most Reviews" },
  { value: "fewest_reviews", label: "Fewest Reviews" },
  { value: "name", label: "Name (A-Z)" },
];

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-zinc-400">N/A</span>;
  const full = Math.floor(rating);
  const partial = rating - full;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i <= full
                ? "text-yellow-400"
                : i === full + 1 && partial > 0
                ? "text-yellow-400/50"
                : "text-zinc-300 dark:text-zinc-600"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-1">
        {rating.toFixed(2)}
      </span>
    </div>
  );
}

export default function ResultsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<SortField>("lowest_weighted");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [minReviews, setMinReviews] = useState("");
  const [maxRating, setMaxRating] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getCountries().then(setCountries).catch(() => {});
  }, []);

  const { data, isLoading, error } = useResults({
    page,
    page_size: 20,
    search: search || undefined,
    sort,
    category: category || undefined,
    country: country || undefined,
    min_reviews: minReviews ? parseInt(minReviews, 10) : undefined,
    max_rating: maxRating ? parseFloat(maxRating) : undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSearchInput("");
    setSort("lowest_weighted");
    setCategory("");
    setCountry("");
    setMinReviews("");
    setMaxRating("");
    setPage(1);
  };

  const hasActiveFilters = search || category || country || minReviews || maxRating || sort !== "lowest_weighted";

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-red-600 dark:text-red-400">
        Failed to load results. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Results
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          All apps discovered across your tracked keywords.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search apps by name..."
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
        {/* Sort */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sort</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortField); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Country</label>
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Min Reviews */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Min Reviews</label>
          <input
            type="number"
            value={minReviews}
            onChange={(e) => { setMinReviews(e.target.value); setPage(1); }}
            placeholder="0"
            min={0}
            className="w-28 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        {/* Max Rating */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Max Rating</label>
          <input
            type="number"
            value={maxRating}
            onChange={(e) => { setMaxRating(e.target.value); setPage(1); }}
            placeholder="5.0"
            min={0}
            max={5}
            step={0.5}
            className="w-28 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results table */}
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
                    App
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Reviews
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                    Keywords
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {data.items.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/apps/${app.id}`}
                        className="flex items-center gap-3 group"
                      >
                        {app.icon_url ? (
                          <img
                            src={app.icon_url}
                            alt={app.name}
                            className="w-10 h-10 rounded-xl shadow-sm"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                            ?
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-red-500 transition-colors">
                            {app.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {app.developer || "Unknown Developer"}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
                      {app.category_name || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={app.average_rating} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300 hidden sm:table-cell">
                      {app.rating_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {app.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">
                      {app.price === 0
                        ? "Free"
                        : `${app.currency} ${app.price.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing {(data.page - 1) * data.page_size + 1}--
                {Math.min(data.page * data.page_size, data.total)} of{" "}
                {data.total.toLocaleString()} apps
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Page {data.page} of {data.total_pages}
                </span>
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
          title="No results found"
          message={
            search || hasActiveFilters
              ? "No apps match your filters. Try adjusting your criteria."
              : "No apps have been discovered yet. Add keywords and run crawls to see results."
          }
        />
      )}
    </div>
  );
}
