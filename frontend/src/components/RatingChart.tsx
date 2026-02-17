"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { RatingHistoryItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RatingChartProps {
  data: RatingHistoryItem[];
}

export default function RatingChart({ data }: RatingChartProps) {
  // Reverse to show oldest first (left to right)
  const chartData = [...data].reverse().map((item) => ({
    date: item.snapshot_date,
    rating: item.average_rating,
    reviews: item.rating_count,
    weighted: item.weighted_score,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-300 dark:stroke-zinc-700" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="fill-zinc-500"
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 12 }}
                className="fill-zinc-500"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover, #1f2937)",
                  border: "1px solid var(--border, #374151)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground, #f3f4f6)",
                }}
                formatter={(value: number, name: string) => [
                  value?.toFixed(2),
                  name === "rating"
                    ? "Avg Rating"
                    : name === "weighted"
                    ? "Weighted Score"
                    : "Reviews",
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Avg Rating"
              />
              <Line
                type="monotone"
                dataKey="weighted"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Weighted Score"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
