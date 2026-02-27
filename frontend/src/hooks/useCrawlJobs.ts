"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import { CrawlJob, PaginatedCrawlJobs, CrawlJobLogsResponse } from "@/types";

interface CrawlJobsFilters {
  page?: number;
  page_size?: number;
  status?: string;
  keyword_id?: number;
}

export function useCrawlJobs(filters: CrawlJobsFilters = {}) {
  const { page = 1, page_size = 20, status, keyword_id } = filters;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(page_size));
  if (status) params.set("status", status);
  if (keyword_id) params.set("keyword_id", String(keyword_id));

  const query = useQuery<PaginatedCrawlJobs>({
    queryKey: ["crawlJobs", page, page_size, status, keyword_id],
    queryFn: () =>
      authFetch<PaginatedCrawlJobs>(`/crawls?${params.toString()}`),
    refetchInterval: (query) => {
      // Auto-poll every 5 seconds when there are running jobs
      const data = query.state.data;
      if (data?.items.some((job) => job.status === "running" || job.status === "pending")) {
        return 5000;
      }
      return false;
    },
  });

  return query;
}

export function useCrawlJob(id: number) {
  return useQuery<CrawlJob>({
    queryKey: ["crawlJob", id],
    queryFn: () => authFetch<CrawlJob>(`/crawls/${id}`),
    enabled: id > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "running" || data.status === "pending")) {
        return 5000;
      }
      return false;
    },
  });
}

interface CrawlJobLogsFilters {
  job_id: number;
  limit?: number;
  offset?: number;
}

export function useCrawlJobLogs(
  filters: CrawlJobLogsFilters,
  jobStatus?: string
) {
  const { job_id, limit = 100, offset = 0 } = filters;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return useQuery<CrawlJobLogsResponse>({
    queryKey: ["crawlJobLogs", job_id, limit, offset],
    queryFn: () =>
      authFetch<CrawlJobLogsResponse>(`/crawls/${job_id}/logs?${params.toString()}`),
    enabled: job_id > 0,
    refetchInterval: () => {
      // Poll every 2 seconds while job is running or pending
      if (jobStatus === "running" || jobStatus === "pending") {
        return 2000;
      }
      return false;
    },
  });
}
