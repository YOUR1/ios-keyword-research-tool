"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import {
  KeywordAnalysis,
  KeywordMetrics,
  KeywordMetricsHistory,
  QuickAnalysis,
  KeywordSuggestions,
} from "@/types";

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

export function useKeywordSuggestions(term: string, countryCode: string = "US") {
  return useQuery<KeywordSuggestions>({
    queryKey: ["keywordSuggestions", term, countryCode],
    queryFn: () =>
      authFetch<KeywordSuggestions>(
        `/keyword-research/suggestions?term=${encodeURIComponent(term)}&country_code=${countryCode}`
      ),
    enabled: term.length >= 2,
  });
}
