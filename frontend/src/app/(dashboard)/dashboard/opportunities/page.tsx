"use client";

import { useOpportunitiesPage } from "@/hooks/useOpportunitiesPage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import StatsGrid from "@/components/dashboard/StatsGrid";
import AlertBanner from "@/components/opportunities/AlertBanner";
import OpportunitiesTable from "@/components/opportunities/OpportunitiesTable";
import TrendingKeywordsCard from "@/components/opportunities/TrendingKeywordsCard";
import ProjectAlertsList from "@/components/opportunities/ProjectAlertsList";
import QuickDiscoveryWidget from "@/components/opportunities/QuickDiscoveryWidget";

export default function OpportunitiesPage() {
  const { status, opportunities, alertSummary, recentAlerts, isLoading } = useOpportunitiesPage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statsItems = [
    {
      label: "Total Opportunities",
      value: status?.opportunities_scored ?? 0,
      highlight: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      label: "Active Alerts",
      value: alertSummary?.active ?? 0,
      highlight: (alertSummary?.active ?? 0) > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      label: "Keywords Discovered",
      value: status?.keywords_discovered ?? 0,
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
      label: "Apps Analyzed",
      value: status?.total_apps ?? 0,
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
          Opportunities
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Discover goldmine opportunities and trending keywords in your niche.
        </p>
      </div>

      {/* Alert Banner */}
      {alertSummary && alertSummary.active > 0 && (
        <AlertBanner summary={alertSummary} />
      )}

      {/* Stats Row */}
      <StatsGrid stats={statsItems} />

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - 60% (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Opportunities Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Top Opportunities
              </h2>
            </div>
            {opportunities && opportunities.length > 0 ? (
              <OpportunitiesTable opportunities={opportunities} limit={10} />
            ) : (
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
                  Run a scan from the ODE page to discover goldmine opportunities.
                </p>
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          {recentAlerts && recentAlerts.length > 0 && (
            <ProjectAlertsList alerts={recentAlerts} />
          )}
        </div>

        {/* Right Column - 40% (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trending Keywords */}
          <TrendingKeywordsCard />

          {/* Quick Discovery */}
          <QuickDiscoveryWidget />

          {/* Info Card */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-emerald-800 dark:text-emerald-200">
                  How Opportunities Work
                </h4>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                  The Opportunity Discovery Engine (ODE) analyzes app ratings, reviews, and market position to identify goldmine opportunities. High scores indicate apps with poor ratings but significant user bases - perfect targets for disruption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
