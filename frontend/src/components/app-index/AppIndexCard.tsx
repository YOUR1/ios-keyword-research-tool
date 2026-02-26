"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { AppIndexItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator, OpportunityScoreBadge, UpdateFrequencyBadge } from "@/components/shared";

interface AppIndexCardProps {
  app: AppIndexItem;
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

export default function AppIndexCard({ app }: AppIndexCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <Link href={`/dashboard/apps/${app.id}`} className="group">
          <div className="flex items-start gap-3 mb-3">
            {app.icon_url ? (
              <Image
                src={app.icon_url}
                alt={app.name}
                className="rounded-lg ring-1 ring-zinc-900/5 dark:ring-white/10 flex-shrink-0"
                width={56}
                height={56}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-900/5 dark:ring-white/10 flex items-center justify-center text-zinc-400 flex-shrink-0">
                ?
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                {app.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {app.developer || "Unknown Developer"}
              </p>
              {app.category_name && (
                <Badge variant="outline" className="font-normal text-xs mt-1.5">
                  {app.category_name}
                </Badge>
              )}
            </div>
          </div>
        </Link>

        <div className="space-y-3 pt-3 border-t border-zinc-900/5 dark:border-white/5">
          {/* Rating & Trend */}
          <div className="flex items-center justify-between">
            <StarRating rating={app.average_rating} />
            <div className="flex items-center gap-1.5">
              <TrendIndicator trend={app.rating_trend} size="sm" />
              {app.rating_change_7d !== null && (
                <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                  {app.rating_change_7d > 0 ? '+' : ''}{app.rating_change_7d.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Reviews & Trend */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {app.rating_count.toLocaleString()} reviews
            </span>
            <div className="flex items-center gap-1.5">
              <TrendIndicator trend={app.reviews_trend} size="sm" />
              {app.reviews_change_7d !== null && (
                <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                  {app.reviews_change_7d > 0 ? '+' : ''}{app.reviews_change_7d.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Opportunity Score */}
          {app.opportunity_score !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Opportunity</span>
              <div className="flex items-center gap-2">
                <OpportunityScoreBadge score={app.opportunity_score} />
                {app.niche_rank !== null && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    #{app.niche_rank}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Last Update */}
          {app.days_since_update !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Last Update</span>
              <UpdateFrequencyBadge daysSinceUpdate={app.days_since_update} />
            </div>
          )}

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900/5 dark:border-white/5">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Price</span>
            {app.price === 0 ? (
              <Badge variant="success">Free</Badge>
            ) : (
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                {app.currency} {app.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
