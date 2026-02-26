"use client";

import { useResultStats } from "@/hooks/useResults";
import { useUsage } from "@/hooks/useUsage";
import { useCrawlJobs } from "@/hooks/useCrawlJobs";
import { formatRemaining } from "@/lib/format";
import StatsGrid from "@/components/dashboard/StatsGrid";
import QuotaMeter from "@/components/dashboard/QuotaMeter";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useResultStats();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: recentCrawls, isLoading: crawlsLoading } = useCrawlJobs({
    page_size: 5,
  });

  const isLoading = statsLoading || usageLoading || crawlsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statsItems = [
    {
      label: "Total Keywords",
      value: stats?.total_keywords ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      label: "Total Apps Found",
      value: stats?.total_apps ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Crawls Today",
      value: usage?.crawls_today ?? 0,
      trend: usage ? formatRemaining(usage.crawls_today, usage.crawls_limit) : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      label: "Plan",
      value: usage?.plan.name ?? "Free",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Overview of your keyword tracking and crawl activity.
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={statsItems} />

      {/* Quota + Recent Crawls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quota Meter */}
        {usage && <QuotaMeter usage={usage} />}

        {/* Recent Crawl Jobs */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Recent Crawls</CardTitle>
            <Link
              href="/dashboard/crawls"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-zinc-900/5 dark:divide-white/5 -mx-6">
              {recentCrawls && recentCrawls.items.length > 0 ? (
                recentCrawls.items.map((job) => (
                  <div
                    key={job.id}
                    className="px-6 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {job.status}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                          {job.keyword_term || "Unknown"}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {job.apps_found} apps found
                          {job.apps_new > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {" "}+{job.apps_new} new
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ml-2">
                      {job.completed_at
                        ? new Date(job.completed_at).toLocaleString()
                        : job.started_at
                        ? "In progress..."
                        : "Pending"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                  No crawl jobs yet. Add a keyword to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
