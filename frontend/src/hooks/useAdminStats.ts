"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";

export interface AdminStats {
  total_users: number;
  total_keywords: number;
  total_crawl_jobs: number;
  total_apps: number;
}

export interface CrawlStatsLast24h {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  success_rate: number;
  avg_duration: number | null;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: () => authFetch<AdminStats>("/admin/stats"),
    staleTime: 30_000, // Cache for 30 seconds
  });
}

export function useCrawlStats24h() {
  return useQuery<CrawlStatsLast24h>({
    queryKey: ["crawlStats24h"],
    queryFn: async () => {
      // Fetch all crawl jobs from last 24 hours
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", "1000");

      const data = await authFetch<{
        items: Array<{
          id: number;
          status: string;
          duration_seconds: number | null;
          created_at: string;
        }>;
        total: number;
      }>(`/crawls?${params.toString()}`);

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Filter to last 24 hours
      const recentJobs = data.items.filter((job) => {
        const createdAt = new Date(job.created_at);
        return createdAt >= last24h;
      });

      const total = recentJobs.length;
      const completed = recentJobs.filter((j) => j.status === "completed").length;
      const failed = recentJobs.filter((j) => j.status === "failed").length;
      const running = recentJobs.filter((j) => j.status === "running").length;
      const pending = recentJobs.filter((j) => j.status === "pending").length;

      const completedJobs = recentJobs.filter(
        (j) => j.status === "completed" && j.duration_seconds !== null
      );
      const avg_duration =
        completedJobs.length > 0
          ? completedJobs.reduce((sum, j) => sum + (j.duration_seconds || 0), 0) /
            completedJobs.length
          : null;

      const success_rate =
        completed + failed > 0 ? (completed / (completed + failed)) * 100 : 0;

      return {
        total,
        completed,
        failed,
        running,
        pending,
        success_rate,
        avg_duration,
      };
    },
    staleTime: 30_000,
  });
}
