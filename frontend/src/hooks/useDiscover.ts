"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import { SearchSuggestionsResponse, TrendingResponse } from "@/types";

export function useSuggestions(term: string, country: string = "US") {
  return useQuery<SearchSuggestionsResponse>({
    queryKey: ["suggestions", term, country],
    queryFn: () =>
      authFetch<SearchSuggestionsResponse>(
        `/discover/suggestions?term=${encodeURIComponent(term)}&country=${country}`
      ),
    enabled: term.length >= 2,
    staleTime: 60_000,
  });
}

export function useTrending(
  country: string = "US",
  limit: number = 25,
  chart: string = "top-free"
) {
  return useQuery<TrendingResponse>({
    queryKey: ["trending", country, limit, chart],
    queryFn: () =>
      authFetch<TrendingResponse>(
        `/discover/trending?country=${country}&limit=${limit}&chart=${chart}`
      ),
    staleTime: 30 * 60_000,
  });
}
