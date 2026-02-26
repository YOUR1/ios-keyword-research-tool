"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-api";
import { PaginatedCrawlJobs } from "@/types";

export default function SyncStatus() {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await authFetch<PaginatedCrawlJobs>("/crawls?status=running&page=1&page_size=1");
        setIsActive(data.total > 0);
      } catch (error) {
        console.error("Failed to fetch sync status:", error);
        setIsActive(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className="relative flex items-center justify-center w-2 h-2">
        <div
          className={`absolute w-2 h-2 rounded-full ${
            isActive
              ? "bg-amber-500 animate-ping opacity-75"
              : "bg-emerald-500"
          }`}
        />
        <div
          className={`relative w-2 h-2 rounded-full ${
            isActive ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
      </div>
      {isActive && (
        <span className="text-xs font-medium text-zinc-900 dark:text-white">
          Syncing...
        </span>
      )}
    </div>
  );
}
