"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import { PaginatedResults, ResultStats, SortField } from "@/types";

interface ResultsFilters {
  page?: number;
  page_size?: number;
  search?: string;
  keyword_id?: number;
  category?: string;
  country?: string;
  min_reviews?: number;
  max_rating?: number | null;
  sort?: SortField;
}

export function useResults(filters: ResultsFilters = {}) {
  const { page = 1, page_size = 20, search, keyword_id, category, country, min_reviews, max_rating, sort } = filters;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(page_size));
  if (search) params.set("search", search);
  if (keyword_id) params.set("keyword_id", String(keyword_id));
  if (category) params.set("category", category);
  if (country) params.set("country", country);
  if (min_reviews) params.set("min_reviews", String(min_reviews));
  if (max_rating !== null && max_rating !== undefined) params.set("max_rating", String(max_rating));
  if (sort) params.set("sort", sort);

  return useQuery<PaginatedResults>({
    queryKey: ["results", page, page_size, search, keyword_id, category, country, min_reviews, max_rating, sort],
    queryFn: () =>
      authFetch<PaginatedResults>(`/results?${params.toString()}`),
  });
}

export function useResultStats() {
  return useQuery<ResultStats>({
    queryKey: ["resultStats"],
    queryFn: () => authFetch<ResultStats>("/results/stats"),
  });
}
