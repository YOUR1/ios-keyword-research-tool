"use client";

interface RelatedKeywordsProps {
  hints: string[];
  onHintClick?: (hint: string) => void;
  className?: string;
}

export default function RelatedKeywords({
  hints,
  onHintClick,
  className = "",
}: RelatedKeywordsProps) {
  if (!hints || hints.length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Related Keywords
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
          No related keywords found.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Related Keywords
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Suggested by Apple Search Hints
          </p>
        </div>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">
          {hints.length} suggestions
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {hints.map((hint, index) => (
          <button
            key={index}
            onClick={() => onHintClick?.(hint)}
            disabled={!onHintClick}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
              bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300
              ${onHintClick
                ? "hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/40 dark:hover:text-red-400 cursor-pointer transition-colors"
                : "cursor-default"
              }
            `}
          >
            <svg
              className="w-3.5 h-3.5 text-zinc-400"
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
            {hint}
          </button>
        ))}
      </div>

      {onHintClick && (
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          Click a keyword to analyze it
        </p>
      )}
    </div>
  );
}
