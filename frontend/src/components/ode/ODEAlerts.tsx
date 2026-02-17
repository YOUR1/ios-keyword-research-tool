"use client";

import { useState } from "react";
import {
  useODEAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
} from "@/hooks/useODE";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const ALERT_TYPES = [
  { value: "", label: "All Types" },
  { value: "goldmine", label: "Goldmine" },
  { value: "trending", label: "Trending" },
  { value: "opportunity", label: "Opportunity" },
];

export default function ODEAlerts() {
  const [alertType, setAlertType] = useState("");
  const [limit, setLimit] = useState(50);
  const { data: alerts, isLoading } = useODEAlerts(limit, alertType || undefined);
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      critical:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      high:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      medium:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
    };
    return colors[priority] || colors.low;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      acknowledged:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      resolved:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    };
    return colors[status] || colors.active;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "goldmine":
        return (
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case "trending":
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Type
          </label>
          <select
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          >
            {ALERT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Limit
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700">
                  {getAlertIcon(alert.alert_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {alert.title}
                      </h4>
                      {alert.description && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {alert.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(
                            alert.priority
                          )}`}
                        >
                          {alert.priority}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(
                            alert.status
                          )}`}
                        >
                          {alert.status}
                        </span>
                        {alert.opportunity_score && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Score: {alert.opportunity_score.toFixed(1)}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatDate(alert.created_at)}
                        </span>
                      </div>
                    </div>
                    {alert.status === "active" && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={resolveMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                    {alert.status === "acknowledged" && (
                      <button
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex-shrink-0"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
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
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No alerts
          </h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {alertType
              ? `No ${alertType} alerts found.`
              : "All clear! No active alerts at the moment."}
          </p>
        </div>
      )}
    </div>
  );
}
