"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppFilters, PaginatedApps, Category, Country } from "@/types";
import { getApps, getCategories, getCountries } from "@/lib/api";

const DEFAULT_FILTERS: AppFilters = {
  sort: "lowest_weighted",
  country: "",
  category: "",
  min_reviews: 0,
  max_rating: null,
  search: "",
  page: 1,
  page_size: 50,
};

export function useApps(initialData?: {
  apps?: PaginatedApps;
  categories?: Category[];
  countries?: Country[];
}) {
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS);

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["apps", filters],
    queryFn: () => getApps(filters),
    initialData: initialData?.apps,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes
    initialData: initialData?.categories,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: getCountries,
    staleTime: 30 * 60 * 1000, // 30 minutes
    initialData: initialData?.countries,
  });

  const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  const fetchApps = (newFilters?: Partial<AppFilters>) => {
    const merged = { ...filters, ...newFilters };
    if (newFilters && !newFilters.page) {
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
    fetchApps,
    setFilters,
  };
}
