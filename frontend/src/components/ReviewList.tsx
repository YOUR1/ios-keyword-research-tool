"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { getAppReviews } from "@/lib/api";
import { ReviewSort } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RatingDistribution from "@/components/RatingDistribution";

interface ReviewListProps {
  appId: number;
}

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "lowest", label: "Lowest Rating" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest Rating" },
];

function ReviewCardSkeleton() {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export default function ReviewList({ appId }: ReviewListProps) {
  const [sort, setSort] = useState<ReviewSort>("lowest");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", appId, sort, page],
    queryFn: () => getAppReviews(appId, { sort, page }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Customer Reviews</CardTitle>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as ReviewSort);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Distribution */}
        {data?.summary && (
          <RatingDistribution
            distribution={data.summary.rating_distribution}
            totalReviews={data.summary.total_reviews}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ReviewCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.items.length === 0 && (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
            No reviews yet
          </p>
        )}

        {/* Review Cards */}
        {!isLoading && data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((review) => (
              <div
                key={review.id}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i <= review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-zinc-300 dark:text-zinc-600"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {review.author_name}
                    </span>
                  </div>
                  {review.review_date && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(review.review_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {review.title && (
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                    {review.title}
                  </p>
                )}
                {review.body && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {review.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Page {data.page} of {data.total_pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={data.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.page >= data.total_pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
