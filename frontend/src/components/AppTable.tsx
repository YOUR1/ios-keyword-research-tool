"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { PaginatedApps } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppTableProps {
  data: PaginatedApps;
  onPageChange: (page: number) => void;
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

function RankBadge({ rank }: { rank: number }) {
  // Use Protocol badge variants for top 3 ranks
  if (rank === 1) {
    return (
      <Badge variant="destructive" className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold">
        {rank}
      </Badge>
    );
  }
  if (rank === 2) {
    return (
      <Badge variant="warning" className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold">
        {rank}
      </Badge>
    );
  }
  if (rank === 3) {
    return (
      <Badge variant="warning" className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300">
        {rank}
      </Badge>
    );
  }
  // Default badge for ranks 4+
  return (
    <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold">
      {rank}
    </Badge>
  );
}

export default function AppTable({ data, onPageChange }: AppTableProps) {
  const startRank = (data.page - 1) * data.page_size + 1;

  return (
    <div className="space-y-4">
      {/* Table container with Protocol styling */}
      <div className="rounded-lg border border-zinc-900/5 bg-white dark:border-white/5 dark:bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>App</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Reviews</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Weighted</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((app, idx) => (
              <TableRow key={app.id}>
                <TableCell>
                  <RankBadge rank={startRank + idx} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/apps/${app.id}`}
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
                <TableCell className="text-right tabular-nums">
                  {app.rating_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell">
                  {app.weighted_score !== null ? (
                    <Badge
                      variant={
                        app.weighted_score < 2
                          ? "destructive"
                          : app.weighted_score < 3
                          ? "warning"
                          : "secondary"
                      }
                      className="tabular-nums font-mono"
                    >
                      {app.weighted_score.toFixed(3)}
                    </Badge>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">&mdash;</span>
                  )}
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

      {/* Pagination with Protocol styling */}
      {data.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-900/5 pt-4 dark:border-white/5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing <span className="font-medium text-zinc-700 dark:text-zinc-300">{startRank}</span>
            &ndash;
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {Math.min(startRank + data.page_size - 1, data.total)}
            </span>{" "}
            of <span className="font-medium text-zinc-700 dark:text-zinc-300">{data.total.toLocaleString()}</span> apps
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="hidden sm:flex items-center gap-1">
              {/* Page indicator */}
              <span className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md tabular-nums">
                {data.page}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                of {data.total_pages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.total_pages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
