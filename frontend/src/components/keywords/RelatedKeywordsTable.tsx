"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface RelatedKeyword {
  term: string;
  popularity?: number;
  competitiveness?: number;
  topApps?: { icon_url: string; name: string }[];
  source?: "apple" | "ai";
}

interface RelatedKeywordsTableProps {
  keywords: RelatedKeyword[];
}

function PopularityBar({ value }: { value?: number }) {
  if (value === undefined) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-300 dark:bg-zinc-600 rounded-full w-0" />
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 w-6">--</span>
      </div>
    );
  }

  const getColor = (val: number) => {
    if (val >= 70) return "bg-emerald-500";
    if (val >= 40) return "bg-emerald-400";
    return "bg-emerald-300";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 w-6">
        {value}
      </span>
    </div>
  );
}

function CompetitivenessBar({ value }: { value?: number }) {
  if (value === undefined) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-300 dark:bg-zinc-600 rounded-full w-0" />
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 w-6">--</span>
      </div>
    );
  }

  // Inverted: high value = hard (red), low value = easy (green)
  const getColor = (val: number) => {
    if (val >= 70) return "bg-red-500";
    if (val >= 40) return "bg-amber-500";
    return "bg-green-500";
  };

  const getLabel = (val: number) => {
    if (val >= 70) return "Hard";
    if (val >= 40) return "Med";
    return "Easy";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium w-8 ${
          value >= 70
            ? "text-red-600 dark:text-red-400"
            : value >= 40
            ? "text-amber-600 dark:text-amber-400"
            : "text-green-600 dark:text-green-400"
        }`}
      >
        {value} <span className="hidden sm:inline">({getLabel(value)})</span>
      </span>
    </div>
  );
}

function StackedAppIcons({
  apps,
}: {
  apps?: { icon_url: string; name: string }[];
}) {
  if (!apps || apps.length === 0) {
    return (
      <div className="flex -space-x-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-800"
          />
        ))}
      </div>
    );
  }

  const displayApps = apps.slice(0, 3);

  return (
    <div className="flex -space-x-2">
      {displayApps.map((app, index) => (
        <div key={index} className="relative" title={app.name}>
          {app.icon_url ? (
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-7 h-7 rounded-lg border-2 border-white dark:border-zinc-800 shadow-sm"
              width={28}
              height={28}
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
              ?
            </div>
          )}
        </div>
      ))}
      {apps.length > 3 && (
        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-700 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          +{apps.length - 3}
        </div>
      )}
    </div>
  );
}

export default function RelatedKeywordsTable({
  keywords,
}: RelatedKeywordsTableProps) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
          No related keywords found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <TableHead className="font-semibold">Keyword</TableHead>
            <TableHead className="font-semibold">Popularity</TableHead>
            <TableHead className="font-semibold">Competitiveness</TableHead>
            <TableHead className="font-semibold">Top Apps</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.map((keyword) => (
            <TableRow
              key={keyword.term}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30"
            >
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                <div className="flex items-center gap-2">
                  {keyword.term}
                  {keyword.source === "ai" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                      AI
                    </span>
                  )}
                  {keyword.source === "apple" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <PopularityBar value={keyword.popularity} />
              </TableCell>
              <TableCell>
                <CompetitivenessBar value={keyword.competitiveness} />
              </TableCell>
              <TableCell>
                <StackedAppIcons apps={keyword.topApps} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
