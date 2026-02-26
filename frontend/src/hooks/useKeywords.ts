"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import { Keyword, KeywordDetail, PaginatedKeywords, CrawlJob } from "@/types";

export function useKeywords(page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedKeywords>({
    queryKey: ["keywords", page, pageSize],
    queryFn: () =>
      authFetch<PaginatedKeywords>(
        `/keywords?page=${page}&page_size=${pageSize}`
      ),
  });
}

export function useKeyword(id: number) {
  return useQuery<KeywordDetail>({
    queryKey: ["keyword", id],
    queryFn: () => authFetch<KeywordDetail>(`/keywords/${id}`),
    enabled: id > 0,
  });
}

export function useCreateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      term: string;
      country_code: string;
      category_id?: number | null;
      crawl_frequency: string;
      expansion_enabled?: boolean;
    }) =>
      authFetch<Keyword>("/keywords", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useUpdateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        term: string;
        country_code: string;
        category_id: number | null;
        crawl_frequency: string;
        expansion_enabled: boolean;
        sub_keywords: string[];
        is_active: boolean;
      }>;
    }) =>
      authFetch<Keyword>(`/keywords/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      queryClient.invalidateQueries({ queryKey: ["keyword", variables.id] });
    },
  });
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      authFetch<void>(`/keywords/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useTriggerCrawl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keywordId: number) =>
      authFetch<CrawlJob>(`/keywords/${keywordId}/crawl`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawlJobs"] });
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useExpandKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keywordId: number) =>
      authFetch<Keyword>(`/keywords/${keywordId}/expand`, {
        method: "POST",
      }),
    onSuccess: (_data, keywordId) => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      queryClient.invalidateQueries({ queryKey: ["keyword", keywordId] });
    },
  });
}
