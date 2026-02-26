"use client";

import { useState } from "react";
import { useDiscoverKeywords } from "@/hooks/useODE";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ODEKeyword } from "@/types";

export default function TrendingKeywordsCard() {
  const [keywords, setKeywords] = useState<ODEKeyword[]>([]);
  const discoverMutation = useDiscoverKeywords();

  const handleDiscover = async () => {
    try {
      const result = await discoverMutation.mutateAsync({
        hours_back: 24,
        min_frequency: 3,
        save: false,
      });
      setKeywords(result.keywords.slice(0, 5));
    } catch (error) {
      console.error("Failed to discover keywords:", error);
    }
  };

  const getTrendBadge = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 50) return "warning";
    return "secondary";
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Trending Keywords</CardTitle>
        <button
          onClick={handleDiscover}
          disabled={discoverMutation.isPending}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
          {discoverMutation.isPending ? "Discovering..." : "Refresh"}
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        {discoverMutation.isPending ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : keywords.length > 0 ? (
          <div className="space-y-3">
            {keywords.map((kw, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {kw.keyword}
                    </span>
                    {kw.is_new && (
                      <Badge variant="success" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {kw.frequency}x frequency
                    </span>
                    <Badge variant={getTrendBadge(kw.trend_score)}>
                      {kw.trend_score.toFixed(0)}
                    </Badge>
                  </div>
                </div>
                <div className="flex-shrink-0 w-16 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden ml-3">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-green-500 rounded-full"
                    style={{ width: `${kw.trend_score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="w-10 h-10 mx-auto text-zinc-400"
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
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Click refresh to discover trending keywords
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
