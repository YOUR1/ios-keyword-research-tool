"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminStats, useCrawlStats24h } from "@/hooks/useAdminStats";
import StatsGrid from "@/components/dashboard/StatsGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminStatsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAdmin();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: crawlStats, isLoading: crawlStatsLoading } = useCrawlStats24h();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, authLoading, router]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isLoading = statsLoading || crawlStatsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statsItems = [
    {
      label: "Total Users",
      value: stats?.total_users ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      label: "Total Keywords",
      value: stats?.total_keywords ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
    },
    {
      label: "Total Apps",
      value: stats?.total_apps ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      label: "Total Crawl Jobs",
      value: stats?.total_crawl_jobs ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
  ];

  const crawlStatsItems = [
    {
      label: "Last 24h",
      value: crawlStats?.total ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Success Rate",
      value: `${crawlStats?.success_rate.toFixed(1) ?? 0}%`,
      highlight: (crawlStats?.success_rate ?? 0) >= 90,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Completed",
      value: crawlStats?.completed ?? 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    {
      label: "Avg Duration",
      value: crawlStats?.avg_duration
        ? `${crawlStats.avg_duration.toFixed(1)}s`
        : "N/A",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "running":
        return "info";
      case "pending":
        return "warning";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
            System Statistics
          </h1>
          <Badge variant="success" className="text-xs">
            Admin Only
          </Badge>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          System-wide metrics and performance statistics.
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          System Overview
        </h2>
        <StatsGrid stats={statsItems} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
          Crawl Performance (Last 24 Hours)
        </h2>
        <StatsGrid stats={crawlStatsItems} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crawl Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant("completed")}>
                    Completed
                  </Badge>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Successfully finished
                  </span>
                </div>
                <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {crawlStats?.completed ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant("running")}>Running</Badge>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Currently in progress
                  </span>
                </div>
                <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {crawlStats?.running ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant("pending")}>Pending</Badge>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Waiting to start
                  </span>
                </div>
                <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {crawlStats?.pending ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant("failed")}>Failed</Badge>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Encountered errors
                  </span>
                </div>
                <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {crawlStats?.failed ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Success Rate
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {crawlStats?.success_rate.toFixed(1) ?? 0}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${crawlStats?.success_rate ?? 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Average Duration
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {crawlStats?.avg_duration
                      ? `${crawlStats.avg_duration.toFixed(2)} seconds`
                      : "No data"}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Total Jobs
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {crawlStats?.total ?? 0}
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Active Jobs
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {(crawlStats?.running ?? 0) + (crawlStats?.pending ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
