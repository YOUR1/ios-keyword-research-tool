"use client";

import { TrendingApp } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface TrendingGridProps {
  apps: TrendingApp[];
  isLoading: boolean;
  onAddKeyword?: (appName: string) => void;
}

export default function TrendingGrid({
  apps,
  isLoading,
  onAddKeyword,
}: TrendingGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        <svg
          className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        <p className="text-sm">No trending apps found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {apps.map((app, index) => (
        <div
          key={app.itunes_id}
          className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
        >
          {/* Rank badge */}
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
              {index + 1}
            </span>
          </div>

          {/* App icon */}
          {app.icon_url ? (
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-10 h-10 rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
          )}

          {/* App info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {app.store_url ? (
                <a
                  href={app.store_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-500 transition-colors"
                >
                  {app.name}
                </a>
              ) : (
                app.name
              )}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {app.developer || "Unknown Developer"}
            </p>
            {app.genres.length > 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                {app.genres.join(", ")}
              </p>
            )}
          </div>

          {/* Add as keyword button */}
          {onAddKeyword && (
            <button
              onClick={() => onAddKeyword(app.name)}
              className="flex-shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Add as keyword"
              aria-label={`Add ${app.name} as keyword`}
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
