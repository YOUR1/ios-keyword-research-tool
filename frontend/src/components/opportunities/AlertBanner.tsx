"use client";

import { useState } from "react";
import Link from "next/link";
import { ODEAlertSummary } from "@/types";

interface AlertBannerProps {
  summary: ODEAlertSummary;
}

export default function AlertBanner({ summary }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || summary.active === 0) {
    return null;
  }

  const getCriticalCount = () => {
    return summary.by_type.goldmine || 0;
  };

  const criticalCount = getCriticalCount();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {summary.active} Active Alert{summary.active !== 1 ? "s" : ""}
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {criticalCount > 0 ? (
                <>
                  <span className="font-medium">{criticalCount} goldmine opportunit{criticalCount !== 1 ? "ies" : "y"}</span> and {" "}
                  {summary.active - criticalCount} other alert{summary.active - criticalCount !== 1 ? "s" : ""} require{" "}
                  attention.
                </>
              ) : (
                <>
                  {summary.active} alert{summary.active !== 1 ? "s" : ""} require{summary.active === 1 ? "s" : ""} your attention.
                </>
              )}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="/dashboard/ode"
                className="text-sm font-medium text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200 underline underline-offset-4 transition-colors"
              >
                View all alerts
              </Link>
              <button
                onClick={() => setDismissed(true)}
                className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
