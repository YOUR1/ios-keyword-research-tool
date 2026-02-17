"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTrending } from "@/hooks/useDiscover";
import { useCreateKeyword } from "@/hooks/useKeywords";
import SuggestionSearch from "@/components/dashboard/SuggestionSearch";
import TrendingGrid from "@/components/dashboard/TrendingGrid";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "BR", name: "Brazil" },
];

const CHARTS = [
  { value: "top-free", label: "Top Free" },
  { value: "top-paid", label: "Top Paid" },
  { value: "top-grossing", label: "Top Grossing" },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [country, setCountry] = useState("US");
  const [chart, setChart] = useState("top-free");
  const [selectedTerm, setSelectedTerm] = useState("");
  const createKeyword = useCreateKeyword();

  const { data: trending, isLoading: trendingLoading } = useTrending(
    country,
    25,
    chart
  );

  const handleTrackKeyword = async (term: string) => {
    if (!term.trim()) return;
    try {
      await createKeyword.mutateAsync({
        term: term.trim(),
        country_code: country,
        crawl_frequency: "daily",
      });
      router.push("/dashboard/keywords");
    } catch {
      // Error handled by react-query
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Discover
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Find keyword ideas and explore trending apps on the App Store.
        </p>
      </div>

      {/* Country selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Country
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Keyword Suggestions */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Keyword Suggestions
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Type to get keyword suggestions from the App Store.
          </p>

          <SuggestionSearch
            country={country}
            onSelect={setSelectedTerm}
            placeholder="e.g. calculator, weather, fitness..."
          />

          {selectedTerm && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
              <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {selectedTerm}
              </span>
              <button
                onClick={() => handleTrackKeyword(selectedTerm)}
                disabled={createKeyword.isPending}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {createKeyword.isPending ? "Adding..." : "Track Keyword"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Trending Apps */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Trending Apps
            </h2>
            <div className="flex gap-1">
              {CHARTS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setChart(c.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chart === c.value
                      ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <TrendingGrid
            apps={trending?.apps ?? []}
            isLoading={trendingLoading}
            onAddKeyword={handleTrackKeyword}
          />
        </div>
      </div>
    </div>
  );
}
