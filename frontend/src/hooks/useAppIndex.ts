"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppIndexFilters, PaginatedAppIndex, Category, Country } from "@/types";
import { authFetch } from "@/lib/auth-api";

const DEFAULT_FILTERS: AppIndexFilters = {
  sort: "lowest_weighted",
  country: "",
  category: "",
  min_reviews: 0,
  max_rating: null,
  min_rating: null,
  price_filter: "all",
  min_opportunity: null,
  search: "",
  page: 1,
  page_size: 50,
};

export function useAppIndex(initialData?: {
  apps?: PaginatedAppIndex;
  categories?: Category[];
  countries?: Country[];
}) {
  const [filters, setFilters] = useState<AppIndexFilters>(DEFAULT_FILTERS);

  // Fetch app index data
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["appIndex", filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.sort) params.sort = filters.sort;
      if (filters.country) params.country = filters.country;
      if (filters.category) params.category = filters.category;
      if (filters.min_reviews) params.min_reviews = String(filters.min_reviews);
      if (filters.max_rating !== null) params.max_rating = String(filters.max_rating);
      if (filters.min_rating !== null) params.min_rating = String(filters.min_rating);
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = String(filters.page);
      if (filters.page_size) params.page_size = String(filters.page_size);

      // Note: The backend doesn't support these filters yet,
      // but we'll add them for when it does
      if (filters.price_filter !== "all") params.price_filter = filters.price_filter;
      if (filters.min_opportunity !== null) params.min_opportunity = String(filters.min_opportunity);

      return authFetch<PaginatedAppIndex>("/apps", params);
    },
    initialData: initialData?.apps,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => authFetch<Category[]>("/categories"),
    staleTime: 30 * 60 * 1000,
    initialData: initialData?.categories,
  });

  // Fetch countries
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: () => authFetch<Country[]>("/categories/countries"),
    staleTime: 30 * 60 * 1000,
    initialData: initialData?.countries,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const updateFilters = (newFilters: Partial<AppIndexFilters>) => {
    const merged = { ...filters, ...newFilters };
    // Reset to page 1 when filters change (except when explicitly setting page)
    if (newFilters && !('page' in newFilters)) {
      merged.page = 1;
    }
    setFilters(merged);
  };

  return {
    filters,
    data: data ?? null,
    loading,
    error,
    categories,
    countries,
    updateFilters,
    setFilters,
  };
}
