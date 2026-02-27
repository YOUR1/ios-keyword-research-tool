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

function HighlightKeyword({ text, keyword }: { text: string; keyword?: string }) {
  if (!keyword || !text) return <>{text}</>;

  const keywordLower = keyword.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(keywordLower);

  if (index === -1) {
    // Try to highlight individual words
    const words = keyword.split(" ");
    let result = text;
    let highlightedParts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find and highlight each word
    const lowerText = text.toLowerCase();
    const matches: { start: number; end: number }[] = [];

    for (const word of words) {
      const wordLower = word.toLowerCase();
      let searchIndex = 0;
      while (searchIndex < lowerText.length) {
        const foundIndex = lowerText.indexOf(wordLower, searchIndex);
        if (foundIndex === -1) break;
        matches.push({ start: foundIndex, end: foundIndex + word.length });
        searchIndex = foundIndex + 1;
      }
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Build highlighted text
    for (const match of matches) {
      if (match.start >= lastIndex) {
        if (match.start > lastIndex) {
          highlightedParts.push(text.slice(lastIndex, match.start));
        }
        highlightedParts.push(
          <mark key={match.start} className="bg-yellow-200 dark:bg-yellow-700 text-inherit px-0.5 rounded">
            {text.slice(match.start, match.end)}
          </mark>
        );
        lastIndex = match.end;
      }
    }

    if (lastIndex < text.length) {
      highlightedParts.push(text.slice(lastIndex));
    }

    return highlightedParts.length > 0 ? <>{highlightedParts}</> : <>{text}</>;
  }

  // Exact match found
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 text-inherit px-0.5 rounded">
        {text.slice(index, index + keyword.length)}
      </mark>
      {text.slice(index + keyword.length)}
    </>
  );
}

function KeywordUsageCell({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="text-zinc-400 dark:text-zinc-500 text-sm">
        Not used
      </span>
    );
  }

  return (
    <span className="text-zinc-900 dark:text-zinc-100 font-medium text-sm">
      {count} {count === 1 ? "time" : "times"}
    </span>
  );
}

export default function TopAppsTable({
  apps,
  keyword,
  titleMatchCount = 0,
  subtitleMatchCount = 0,
  className = "",
}: TopAppsTableProps) {
  if (!apps || apps.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Top results
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
          No apps found for this keyword.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th
                colSpan={1}
                className="text-left px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/50"
              >
                Top results
              </th>
              <th
                colSpan={2}
                className="text-center px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/50 border-l border-zinc-200 dark:border-zinc-700"
              >
                Ratings
              </th>
              <th
                colSpan={2}
                className="text-center px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/50 border-l border-zinc-200 dark:border-zinc-700"
              >
                Keyword usage
              </th>
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                App
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-l border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                Rating
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-l border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                Reviews
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-l border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                In Name
              </th>
              <th className="text-center px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-l border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                In Subtitle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {apps.map((app, index) => (
              <tr
                key={app.itunes_id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    {/* App Icon */}
                    {app.icon_url ? (
                      <img
                        src={app.icon_url}
                        alt={app.name}
                        className="w-12 h-12 rounded-xl shadow-sm flex-shrink-0"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400 flex-shrink-0">
                        ?
                      </div>
                    )}

                    {/* App Info */}
                    <div className="min-w-0 flex-1">
                      {/* Rank + Title */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                          {index + 1}.
                        </span>
                        {app.id ? (
                          <Link
                            href={`/dashboard/apps/${app.id}`}
                            className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            <HighlightKeyword text={app.name} keyword={keyword} />
                          </Link>
                        ) : (
                          <a
                            href={`https://apps.apple.com/app/id${app.itunes_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-red-500 dark:hover:text-red-400 transition-colors inline-flex items-center gap-1"
                          >
                            <HighlightKeyword text={app.name} keyword={keyword} />
                            <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>

                      {/* Subtitle */}
                      {app.subtitle && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">
                          <HighlightKeyword text={app.subtitle} keyword={keyword} />
                        </p>
                      )}

                      {/* Developer + Price */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          By{" "}
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {app.developer || "Unknown"}
                          </span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-600 text-xs text-zinc-600 dark:text-zinc-400">
                          {app.price === 0 ? "Free" : `${app.currency} ${app.price.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Rating */}
                <td className="px-4 py-4 text-center border-l border-zinc-100 dark:border-zinc-700/50">
                  {app.average_rating != null ? (
                    <div className="flex items-center justify-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {app.average_rating.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 text-sm">-</span>
                  )}
                </td>

                {/* Reviews */}
                <td className="px-4 py-4 text-center border-l border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {app.rating_count.toLocaleString()}
                  </span>
                </td>

                {/* In Name */}
                <td className="px-4 py-4 text-center border-l border-zinc-100 dark:border-zinc-700/50">
                  <KeywordUsageCell count={app.title_match_count} />
                </td>

                {/* In Subtitle */}
                <td className="px-4 py-4 text-center border-l border-zinc-100 dark:border-zinc-700/50">
                  <KeywordUsageCell count={app.subtitle_match_count} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing top {apps.length} apps for {keyword ? `"${keyword}"` : "this keyword"}
          {(titleMatchCount > 0 || subtitleMatchCount > 0) && (
            <span className="ml-2">
              ({titleMatchCount} in title, {subtitleMatchCount} in subtitle)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
