"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
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
  if (rating === null) return <span className="text-zinc-400">N/A</span>;
  const full = Math.floor(rating);
  const partial = rating - full;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= full
                ? "text-yellow-400 fill-yellow-400"
                : i === full + 1 && partial > 0
                ? "text-yellow-400/50 fill-yellow-400/50"
                : "text-zinc-300 dark:text-zinc-600"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-1">
        {rating.toFixed(2)}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  let variant: "default" | "destructive" | "outline" | "secondary" = "secondary";
  let className = "";
  if (rank === 1) {
    variant = "destructive";
  } else if (rank === 2) {
    className = "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border-transparent";
  } else if (rank === 3) {
    className = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-transparent";
  }

  return (
    <Badge variant={variant} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${className}`}>
      {rank}
    </Badge>
  );
}

export default function AppTable({ data, onPageChange }: AppTableProps) {
  const startRank = (data.page - 1) * data.page_size + 1;

  return (
    <div>
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
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
                <TableRow key={app.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
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
                          className="rounded-xl shadow-sm"
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
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
                    {app.category_name || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <StarRating rating={app.average_rating} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {app.rating_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono hidden lg:table-cell">
                    <span
                      className={`${
                        app.weighted_score !== null && app.weighted_score < 2
                          ? "text-red-500 font-bold"
                          : app.weighted_score !== null && app.weighted_score < 3
                          ? "text-orange-500"
                          : "text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {app.weighted_score?.toFixed(3) ?? "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">
                    {app.price === 0
                      ? "Free"
                      : `${app.currency} ${app.price.toFixed(2)}`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.items.length === 0 && (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No apps found matching your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {startRank}&ndash;{Math.min(startRank + data.page_size - 1, data.total)} of{" "}
            {data.total.toLocaleString()} apps
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
              Page {data.page} of {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
