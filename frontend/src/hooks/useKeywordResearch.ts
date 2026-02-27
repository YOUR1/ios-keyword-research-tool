"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import {
  KeywordAnalysis,
  KeywordMetrics,
  KeywordMetricsHistory,
  QuickAnalysis,
  AIKeywordExpansionResponse,
} from "@/types";

/**
 * Query hook for fetching stored analysis data (read-only, no API calls).
 * Use this for initial page load.
 */
export function useKeywordAnalysis(
  keywordId: number,
  options?: { enabled?: boolean }
) {
  return useQuery<KeywordAnalysis>({
    queryKey: ["keywordAnalysis", keywordId],
    queryFn: () =>
      authFetch<KeywordAnalysis>(`/keyword-research/${keywordId}/analysis`),
    enabled: (options?.enabled ?? true) && keywordId > 0,
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

/**
 * Mutation hook for triggering fresh analysis (makes iTunes API calls).
 * Use this for "Research" button or force refresh.
 */
export function useAnalyzeKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      keywordId,
      forceRefresh = false,
    }: {
      keywordId: number;
      forceRefresh?: boolean;
    }) => {
      const params = new URLSearchParams();
      if (forceRefresh) params.set("force_refresh", "true");
      const query = params.toString() ? `?${params.toString()}` : "";
      return authFetch<KeywordAnalysis>(
        `/keyword-research/${keywordId}/analyze${query}`,
        { method: "POST" }
      );
    },
    onSuccess: (_data, variables) => {
      // Invalidate all related queries so they refetch
      queryClient.invalidateQueries({
        queryKey: ["keywordAnalysis", variables.keywordId],
      });
      queryClient.invalidateQueries({
        queryKey: ["keywordMetrics", variables.keywordId],
      });
      queryClient.invalidateQueries({
        queryKey: ["keywordMetricsHistory", variables.keywordId],
      });
      queryClient.invalidateQueries({
        queryKey: ["keyword", variables.keywordId],
      });
    },
  });
}

export function useKeywordMetrics(keywordId: number) {
  return useQuery<KeywordMetrics>({
    queryKey: ["keywordMetrics", keywordId],
    queryFn: () => authFetch<KeywordMetrics>(`/keyword-research/${keywordId}/metrics`),
    enabled: keywordId > 0,
    retry: false,
  });
}

export function useKeywordMetricsHistory(keywordId: number, days: number = 30) {
  return useQuery<KeywordMetricsHistory>({
    queryKey: ["keywordMetricsHistory", keywordId, days],
    queryFn: () =>
      authFetch<KeywordMetricsHistory>(
        `/keyword-research/${keywordId}/metrics/history?days=${days}`
      ),
    enabled: keywordId > 0,
  });
}

export function useQuickAnalyze() {
  return useMutation({
    mutationFn: ({ term, countryCode = "US" }: { term: string; countryCode?: string }) =>
      authFetch<QuickAnalysis>("/keyword-research/quick-analyze", {
        method: "POST",
        body: JSON.stringify({ term, country_code: countryCode }),
      }),
  });
}

/**
 * Mutation hook for AI keyword expansion.
 * Generates semantically related keywords using AI.
 */
export function useAIKeywordExpansion() {
  return useMutation({
    mutationFn: ({
      keywordId,
      count = 15,
    }: {
      keywordId: number;
      count?: number;
    }) => {
      const params = new URLSearchParams();
      params.set("count", count.toString());
      return authFetch<AIKeywordExpansionResponse>(
        `/keyword-research/${keywordId}/expand-ai?${params.toString()}`,
        { method: "POST" }
      );
    },
  });
}
