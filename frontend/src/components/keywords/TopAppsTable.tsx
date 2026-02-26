"use client";

import Link from "next/link";
import { TopAppInfo } from "@/types";

interface TopAppsTableProps {
  apps: TopAppInfo[];
  keyword?: string;
  titleMatchCount?: number;
  subtitleMatchCount?: number;
  className?: string;
}

function StarRating({ rating, count }: { rating: number | null; count?: number }) {
  if (rating === null) return <span className="text-zinc-400">N/A</span>;
  const full = Math.floor(rating);
  const partial = rating - full;

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mr-1">
          {count?.toLocaleString()}
        </span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <svg
              key={i}
              className={`w-3 h-3 ${
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
      </div>
    </div>
  );
}

function KeywordUsageBadge({ inTitle, inSubtitle }: { inTitle: boolean; inSubtitle: boolean }) {
  if (inTitle) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        In Title
      </span>
    );
  }
  if (inSubtitle) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
        In Subtitle
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
      Not used
    </span>
  );
}

function getRankBadgeStyle(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400";
    case 2:
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";
    case 3:
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
    default:
      return "bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

export default function TopAppsTable({ apps, keyword, titleMatchCount = 0, subtitleMatchCount = 0, className = "" }: TopAppsTableProps) {
  if (!apps || apps.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Search Results
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
          No apps found for this keyword.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Search Results
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Top {apps.length} apps for {keyword ? `"${keyword}"` : "this keyword"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 font-semibold text-xs">
                {titleMatchCount}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">in title</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-semibold text-xs">
                {subtitleMatchCount}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">in subtitle</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-12">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                App
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Keyword Usage
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Ratings
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                Score
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                Price
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {apps.map((app, index) => (
              <tr
                key={app.itunes_id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getRankBadgeStyle(index + 1)}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {app.id ? (
                    <Link href={`/dashboard/apps/${app.id}`} className="flex items-center gap-3 group">
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
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-red-500 transition-colors line-clamp-1">
                          {app.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {app.developer || "Unknown Developer"}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <a
                      href={`https://apps.apple.com/app/id${app.itunes_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
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
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-red-500 transition-colors line-clamp-1">
                          {app.name}
                          <svg className="w-3 h-3 inline-block ml-1 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {app.developer || "Unknown Developer"}
                        </p>
                      </div>
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <KeywordUsageBadge inTitle={app.title_match} inSubtitle={app.subtitle_match} />
                </td>
                <td className="px-4 py-3">
                  <StarRating rating={app.average_rating} count={app.rating_count} />
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                  {app.weighted_score ? app.weighted_score.toFixed(2) : "--"}
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-300 hidden md:table-cell">
                  {app.price === 0 ? (
                    <span className="text-green-600 dark:text-green-400">Free</span>
                  ) : (
                    `${app.currency} ${app.price.toFixed(2)}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
