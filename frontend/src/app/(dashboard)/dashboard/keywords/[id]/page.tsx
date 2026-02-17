"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useKeyword, useTriggerCrawl, useExpandKeyword, useUpdateKeyword } from "@/hooks/useKeywords";
import { useResults } from "@/hooks/useResults";
import { useCrawlJobs } from "@/hooks/useCrawlJobs";
import CrawlStatusBadge from "@/components/dashboard/CrawlStatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { useState } from "react";

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

export default function KeywordDetailPage() {
  const params = useParams();
  const keywordId = Number(params.id);
  const [resultsPage, setResultsPage] = useState(1);
  const [crawlsPage, setCrawlsPage] = useState(1);
  const [editingSubKeywords, setEditingSubKeywords] = useState(false);
  const [newSubKeyword, setNewSubKeyword] = useState("");

  const { data: keyword, isLoading: keywordLoading, error: keywordError } = useKeyword(keywordId);
  const expandKeyword = useExpandKeyword();
  const updateKeyword = useUpdateKeyword();
  const { data: results, isLoading: resultsLoading } = useResults({
    keyword_id: keywordId,
    page: resultsPage,
    page_size: 10,
  });
  const { data: crawlJobs, isLoading: crawlsLoading } = useCrawlJobs({
    keyword_id: keywordId,
    page: crawlsPage,
    page_size: 10,
  });
  const triggerCrawl = useTriggerCrawl();

  if (keywordLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (keywordError || !keyword) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-red-600 dark:text-red-400">
        Keyword not found or failed to load.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/dashboard/keywords"
          className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          Keywords
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{keyword.term}</span>
      </div>

      {/* Keyword Info Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {keyword.term}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {keyword.country_code}
              </span>
              <span className="capitalize">{keyword.crawl_frequency}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  keyword.is_active
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                }`}
              >
                {keyword.is_active ? "Active" : "Paused"}
              </span>
            </div>
          </div>
          <button
            onClick={() => triggerCrawl.mutate(keywordId)}
            disabled={triggerCrawl.isPending}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {triggerCrawl.isPending ? "Starting..." : "Crawl Now"}
          </button>
        </div>

        {/* Metadata grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Created</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {new Date(keyword.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Last Crawled</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {keyword.last_crawled_at
                ? new Date(keyword.last_crawled_at).toLocaleDateString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Apps Found</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {keyword.total_apps_found}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Crawls</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {keyword.total_crawl_jobs}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Keywords Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI-Expanded Keywords
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {keyword.expansion_enabled
                ? "These related terms are searched during crawls to find more apps"
                : "Keyword expansion is disabled - only the main term is searched"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {keyword.expansion_enabled && (
              <button
                onClick={() => expandKeyword.mutate(keywordId)}
                disabled={expandKeyword.isPending}
                className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {expandKeyword.isPending ? "Regenerating..." : "Regenerate"}
              </button>
            )}
            <button
              onClick={() =>
                updateKeyword.mutate({
                  id: keywordId,
                  data: { expansion_enabled: !keyword.expansion_enabled },
                })
              }
              disabled={updateKeyword.isPending}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                keyword.expansion_enabled
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              {keyword.expansion_enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {keyword.expansion_enabled && (
          <>
            {/* Sub-keywords list */}
            <div className="flex flex-wrap gap-2 mb-4">
              {keyword.sub_keywords && keyword.sub_keywords.length > 0 ? (
                keyword.sub_keywords.map((subKw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    {subKw}
                    {editingSubKeywords && (
                      <button
                        onClick={() => {
                          const newList = keyword.sub_keywords?.filter((_, i) => i !== idx) || [];
                          updateKeyword.mutate({
                            id: keywordId,
                            data: { sub_keywords: newList },
                          });
                        }}
                        className="ml-1 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </span>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                  No sub-keywords yet. Click &quot;Regenerate&quot; to generate them using AI.
                </p>
              )}
            </div>

            {/* Edit controls */}
            <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              {editingSubKeywords ? (
                <>
                  <input
                    type="text"
                    value={newSubKeyword}
                    onChange={(e) => setNewSubKeyword(e.target.value)}
                    placeholder="Add a sub-keyword"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubKeyword.trim()) {
                        const newList = [...(keyword.sub_keywords || []), newSubKeyword.trim()];
                        updateKeyword.mutate({
                          id: keywordId,
                          data: { sub_keywords: newList },
                        });
                        setNewSubKeyword("");
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newSubKeyword.trim()) {
                        const newList = [...(keyword.sub_keywords || []), newSubKeyword.trim()];
                        updateKeyword.mutate({
                          id: keywordId,
                          data: { sub_keywords: newList },
                        });
                        setNewSubKeyword("");
                      }
                    }}
                    disabled={!newSubKeyword.trim()}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setEditingSubKeywords(false);
                      setNewSubKeyword("");
                    }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingSubKeywords(true)}
                  className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Edit Sub-Keywords
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Apps Found */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Apps Found
        </h2>
        {resultsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : results && results.items.length > 0 ? (
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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Reviews
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {results.items.map((app) => (
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
                      <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300">
                        {app.rating_count.toLocaleString()}
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

            {results.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Page {results.page} of {results.total_pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                    disabled={results.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setResultsPage((p) => p + 1)}
                    disabled={results.page >= results.total_pages}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="No apps found yet"
            message="Trigger a crawl to discover apps for this keyword."
            actionLabel="Crawl Now"
            onAction={() => triggerCrawl.mutate(keywordId)}
          />
        )}
      </div>

      {/* Crawl History */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Crawl History
        </h2>
        {crawlsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : crawlJobs && crawlJobs.items.length > 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {crawlJobs.items.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
                    >
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
                      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                        {job.started_at
                          ? new Date(job.started_at).toLocaleString()
                          : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {crawlJobs.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Page {crawlJobs.page} of {crawlJobs.total_pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCrawlsPage((p) => Math.max(1, p - 1))}
                    disabled={crawlJobs.page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCrawlsPage((p) => p + 1)}
                    disabled={crawlJobs.page >= crawlJobs.total_pages}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No crawl history yet.
          </div>
        )}
      </div>
    </div>
  );
}
