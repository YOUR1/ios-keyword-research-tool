"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { PaginatedAppIndex } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator, OpportunityScoreBadge, UpdateFrequencyBadge } from "@/components/shared";

interface AppIndexTableProps {
  data: PaginatedAppIndex;
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-zinc-500 dark:text-zinc-400">N/A</span>;
  const full = Math.floor(rating);
  const partial = rating - full;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i <= full
                ? "text-amber-400 fill-amber-400"
                : i === full + 1 && partial > 0
                ? "text-amber-400/50 fill-amber-400/50"
                : "text-zinc-300 dark:text-zinc-600"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-zinc-700 dark:text-zinc-300 tabular-nums">
        {rating.toFixed(2)}
      </span>
    </div>
  );
}

export default function AppIndexTable({ data }: AppIndexTableProps) {
  return (
    <div className="rounded-lg border border-zinc-900/5 bg-white dark:border-white/5 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>App</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="hidden lg:table-cell">Trend</TableHead>
            <TableHead className="text-right">Reviews</TableHead>
            <TableHead className="hidden lg:table-cell">Review Trend</TableHead>
            <TableHead className="hidden xl:table-cell">Opportunity</TableHead>
            <TableHead className="hidden xl:table-cell">Last Update</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                <Link
                  href={`/dashboard/apps/${app.id}`}
                  className="flex items-center gap-3 group"
                >
                  {app.icon_url ? (
                    <Image
                      src={app.icon_url}
                      alt={app.name}
                      className="rounded-lg ring-1 ring-zinc-900/5 dark:ring-white/10"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-900/5 dark:ring-white/10 flex items-center justify-center text-zinc-400">
                      ?
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                      {app.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {app.developer || "Unknown Developer"}
                    </p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {app.category_name ? (
                  <Badge variant="outline" className="font-normal">
                    {app.category_name}
                  </Badge>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-400">&mdash;</span>
                )}
              </TableCell>
              <TableCell>
                <StarRating rating={app.average_rating} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <TrendIndicator trend={app.rating_trend ?? 'stable'} size="sm" />
                  {app.rating_change_7d != null && (
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {app.rating_change_7d > 0 ? '+' : ''}{app.rating_change_7d.toFixed(2)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {app.rating_count.toLocaleString()}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <TrendIndicator trend={app.reviews_trend ?? 'stable'} size="sm" />
                  {app.reviews_change_7d != null && (
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {app.reviews_change_7d > 0 ? '+' : ''}{app.reviews_change_7d.toLocaleString()}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {app.opportunity_score != null ? (
                  <div className="flex items-center gap-2">
                    <OpportunityScoreBadge score={app.opportunity_score} />
                    {app.niche_rank != null && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        #{app.niche_rank}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-400">&mdash;</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <UpdateFrequencyBadge daysSinceUpdate={app.days_since_update} />
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell">
                {app.price === 0 ? (
                  <Badge variant="success">Free</Badge>
                ) : (
                  <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {app.currency} {app.price.toFixed(2)}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Empty state */}
      {data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No apps found matching your filters.
          </p>
        </div>
      )}
    </div>
  );
}
