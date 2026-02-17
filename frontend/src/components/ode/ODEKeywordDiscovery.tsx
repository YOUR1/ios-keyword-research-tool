"use client";

import { useState } from "react";
import { useDiscoverKeywords } from "@/hooks/useODE";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ODEKeyword } from "@/types";

export default function ODEKeywordDiscovery() {
  const [hoursBack, setHoursBack] = useState(24);
  const [minFrequency, setMinFrequency] = useState(3);
  const [discoveredKeywords, setDiscoveredKeywords] = useState<ODEKeyword[]>(
    []
  );
  const discoverMutation = useDiscoverKeywords();

  const handleDiscover = async () => {
    const result = await discoverMutation.mutateAsync({
      hours_back: hoursBack,
      min_frequency: minFrequency,
      save: true,
    });
    setDiscoveredKeywords(result.keywords);
  };

  const getTrendBadge = (score: number) => {
    if (score >= 80)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 50)
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
  };

  return (
    <div className="space-y-6">
      {/* Discovery Controls */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Discovery Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Lookback Period
            </label>
            <select
              value={hoursBack}
              onChange={(e) => setHoursBack(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 48 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Minimum Frequency
            </label>
            <select
              value={minFrequency}
              onChange={(e) => setMinFrequency(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value={2}>2+ occurrences</option>
              <option value={3}>3+ occurrences</option>
              <option value={5}>5+ occurrences</option>
              <option value={10}>10+ occurrences</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDiscover}
              disabled={discoverMutation.isPending}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {discoverMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Discovering...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Discover Keywords
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Discovery Result */}
      {discoverMutation.data && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Discovery Complete
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Discovered {discoverMutation.data.discovered} keywords, saved{" "}
                {discoverMutation.data.saved} to database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Discovered Keywords */}
      {discoveredKeywords.length > 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Discovered Keywords ({discoveredKeywords.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Trend Score
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Source Apps
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {discoveredKeywords.map((kw, index) => (
                  <tr
                    key={index}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {kw.keyword}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {kw.frequency}x
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-green-500 rounded-full"
                            style={{ width: `${kw.trend_score}%` }}
                          />
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTrendBadge(
                            kw.trend_score
                          )}`}
                        >
                          {kw.trend_score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {kw.is_new ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          New
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                          Existing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {kw.source_apps.length} apps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !discoverMutation.isPending && (
          <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <svg
              className="w-12 h-12 mx-auto text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No keywords discovered yet
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Configure the discovery parameters above and click "Discover
              Keywords" to find trending keywords from app data.
            </p>
          </div>
        )
      )}

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              How Keyword Discovery Works
            </h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              The discovery engine analyzes app names and descriptions from
              recently crawled apps to extract trending keywords. Keywords are
              scored based on frequency, recency, and novelty. New keywords are
              highlighted to help you spot emerging trends early.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
