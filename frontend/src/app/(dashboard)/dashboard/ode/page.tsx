"use client";

import { useState } from "react";
import { useODEStatus, useODEAlertSummary } from "@/hooks/useODE";
import StatsGrid from "@/components/dashboard/StatsGrid";
import ODEOpportunities from "@/components/ode/ODEOpportunities";
import ODEAlerts from "@/components/ode/ODEAlerts";
import ODEKeywordDiscovery from "@/components/ode/ODEKeywordDiscovery";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type Tab = "overview" | "opportunities" | "alerts" | "discovery";

export default function ODEPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { data: status, isLoading: statusLoading } = useODEStatus();
  const { data: alertSummary } = useODEAlertSummary(24);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "opportunities", label: "Opportunities" },
    { id: "alerts", label: "Alerts" },
    { id: "discovery", label: "Keyword Discovery" },
  ];

  const stats = status
    ? [
        {
          label: "Keywords Discovered",
          value: status.keywords_discovered,
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
          label: "Opportunities Scored",
          value: status.opportunities_scored,
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          ),
        },
        {
          label: "Active Alerts",
          value: status.active_alerts,
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
          label: "Total Apps",
          value: status.total_apps,
          trend: status.latest_scan
            ? `Last scan: ${status.latest_scan}`
            : "No scans yet",
          icon: (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Opportunity Discovery Engine
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Discover trending keywords and find goldmine opportunities in the App
          Store.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-red-500 text-red-600 dark:text-red-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {tab.id === "alerts" && alertSummary && alertSummary.active > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {alertSummary.active}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {statusLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <StatsGrid stats={stats} />

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Goldmine Formula
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    Find apps with high downloads but low ratings - prime
                    opportunities for disruption.
                  </p>
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                    score = (downloads / max) * (1 - rating/5) * 100
                  </div>
                  <button
                    onClick={() => setActiveTab("opportunities")}
                    className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    View Opportunities
                  </button>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Keyword Trends
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    Discover trending keywords from app names and descriptions
                    to find untapped niches.
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Scheduled Discovery
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        Every 6 hours
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Opportunity Scan
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        Daily at 4 AM
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("discovery")}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Discover Keywords
                  </button>
                </div>
              </div>

              {/* Alert Summary */}
              {alertSummary && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Alert Summary (Last 24h)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                        {alertSummary.total}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Total
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {alertSummary.active}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Active
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {alertSummary.resolved}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Resolved
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {alertSummary.by_type?.goldmine || 0}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Goldmine
                      </div>
                    </div>
                  </div>
                  {alertSummary.active > 0 && (
                    <button
                      onClick={() => setActiveTab("alerts")}
                      className="mt-4 w-full px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
                    >
                      View {alertSummary.active} Active Alerts
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "opportunities" && <ODEOpportunities />}
      {activeTab === "alerts" && <ODEAlerts />}
      {activeTab === "discovery" && <ODEKeywordDiscovery />}
    </div>
  );
}
