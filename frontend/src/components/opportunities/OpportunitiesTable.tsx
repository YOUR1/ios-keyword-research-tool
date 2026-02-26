"use client";

import Link from "next/link";
import { ODETopOpportunity } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OpportunitiesTableProps {
  opportunities: ODETopOpportunity[];
  limit?: number;
}

export default function OpportunitiesTable({
  opportunities,
  limit = 10,
}: OpportunitiesTableProps) {
  const displayOpportunities = opportunities.slice(0, limit);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    return "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-700";
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${
              i < fullStars
                ? "text-yellow-400"
                : i === fullStars && hasHalf
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
    );
  };

  if (displayOpportunities.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No opportunities yet
        </h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Run a scan to discover goldmine opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                App
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Score
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Rating
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Reviews
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {displayOpportunities.map((opp, index) => (
              <tr
                key={opp.app_id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {opp.niche_rank || index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/apps/${opp.app_id}`}
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {opp.app_name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      opp.opportunity_score >= 90
                        ? "success"
                        : opp.opportunity_score >= 70
                        ? "warning"
                        : "secondary"
                    }
                    className="font-semibold"
                  >
                    {opp.opportunity_score.toFixed(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getRatingStars(opp.average_rating)}
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {opp.average_rating.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {opp.rating_count.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/dashboard/apps/${opp.app_id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
