"use client";

import { Star } from "lucide-react";

interface RatingDistributionProps {
  distribution: Record<string, number>;
  totalReviews: number;
}

const BAR_COLORS: Record<string, string> = {
  "5": "bg-green-500",
  "4": "bg-lime-500",
  "3": "bg-yellow-500",
  "2": "bg-orange-500",
  "1": "bg-red-500",
};

export default function RatingDistribution({
  distribution,
  totalReviews,
}: RatingDistributionProps) {
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[String(stars)] || 0;
        const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return (
          <div key={stars} className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-0.5 w-10 justify-end text-zinc-600 dark:text-zinc-400">
              {stars} <Star className="w-3 h-3 fill-current" />
            </span>
            <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${BAR_COLORS[String(stars)]}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-10 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">
              {count}
            </span>
          </div>
        );
      })}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-2">
        {totalReviews.toLocaleString()} review{totalReviews !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}
