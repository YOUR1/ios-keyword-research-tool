import {
  PaginatedApps,
  PaginatedReviews,
  AppDetail,
  RatingHistoryItem,
  Category,
  Country,
  IndexStats,
  AppFilters,
  ReviewSort,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8282/api/v1";

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getApps(filters: Partial<AppFilters>): Promise<PaginatedApps> {
  const params: Record<string, string> = {};
  if (filters.sort) params.sort = filters.sort;
  if (filters.country) params.country = filters.country;
  if (filters.category) params.category = filters.category;
  if (filters.min_reviews) params.min_reviews = String(filters.min_reviews);
  if (filters.max_rating !== null && filters.max_rating !== undefined)
    params.max_rating = String(filters.max_rating);
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = String(filters.page);
  if (filters.page_size) params.page_size = String(filters.page_size);

  return fetchApi<PaginatedApps>("/apps", params);
}

export async function getApp(id: number): Promise<AppDetail> {
  return fetchApi<AppDetail>(`/apps/${id}`);
}

export async function getAppHistory(id: number): Promise<RatingHistoryItem[]> {
  return fetchApi<RatingHistoryItem[]>(`/apps/${id}/history`);
}

export async function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>("/categories");
}

export async function getCountries(): Promise<Country[]> {
  return fetchApi<Country[]>("/categories/countries");
}

export async function getStats(): Promise<IndexStats> {
  return fetchApi<IndexStats>("/apps/stats");
}

export async function getAppReviews(
  appId: number,
  params?: { page?: number; sort?: ReviewSort; language?: string }
): Promise<PaginatedReviews> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.sort) queryParams.sort = params.sort;
  if (params?.language) queryParams.language = params.language;
  return fetchApi<PaginatedReviews>(`/apps/${appId}/reviews`, queryParams);
}
