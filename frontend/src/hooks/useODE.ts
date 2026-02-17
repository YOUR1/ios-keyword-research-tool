"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import {
  ODEStatus,
  ODETopOpportunity,
  ODEAlert,
  ODEAlertSummary,
  ODEDiscoveryResponse,
  ODEScanResponse,
} from "@/types";

// Status
export function useODEStatus() {
  return useQuery<ODEStatus>({
    queryKey: ["ode", "status"],
    queryFn: () => authFetch<ODEStatus>("/ode/status"),
    staleTime: 60_000,
  });
}

// Top Opportunities
export function useTopOpportunities(
  limit: number = 20,
  countryId?: number,
  categoryId?: number
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (countryId) params.set("country_id", String(countryId));
  if (categoryId) params.set("category_id", String(categoryId));

  return useQuery<ODETopOpportunity[]>({
    queryKey: ["ode", "opportunities", "top", limit, countryId, categoryId],
    queryFn: () =>
      authFetch<ODETopOpportunity[]>(`/ode/opportunities/top?${params}`),
    staleTime: 5 * 60_000,
  });
}

// Alerts
export function useODEAlerts(limit: number = 50, alertType?: string) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (alertType) params.set("alert_type", alertType);

  return useQuery<ODEAlert[]>({
    queryKey: ["ode", "alerts", limit, alertType],
    queryFn: () => authFetch<ODEAlert[]>(`/ode/alerts?${params}`),
    staleTime: 60_000,
  });
}

// Alert Summary
export function useODEAlertSummary(hours: number = 24) {
  return useQuery<ODEAlertSummary>({
    queryKey: ["ode", "alerts", "summary", hours],
    queryFn: () =>
      authFetch<ODEAlertSummary>(`/ode/alerts/summary?hours=${hours}`),
    staleTime: 5 * 60_000,
  });
}

// Discover Keywords (mutation)
export function useDiscoverKeywords() {
  const queryClient = useQueryClient();

  return useMutation<
    ODEDiscoveryResponse,
    Error,
    {
      country_id?: number;
      category_id?: number;
      hours_back?: number;
      min_frequency?: number;
      save?: boolean;
    }
  >({
    mutationFn: async (params) => {
      const searchParams = new URLSearchParams();
      if (params.country_id)
        searchParams.set("country_id", String(params.country_id));
      if (params.category_id)
        searchParams.set("category_id", String(params.category_id));
      if (params.hours_back)
        searchParams.set("hours_back", String(params.hours_back));
      if (params.min_frequency)
        searchParams.set("min_frequency", String(params.min_frequency));
      if (params.save !== undefined)
        searchParams.set("save", String(params.save));

      return authFetch<ODEDiscoveryResponse>(
        `/ode/keywords/discover?${searchParams}`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ode", "status"] });
    },
  });
}

// Scan Opportunities (mutation)
export function useScanOpportunities() {
  const queryClient = useQueryClient();

  return useMutation<
    ODEScanResponse,
    Error,
    {
      country_id?: number;
      category_id?: number;
      min_rating_count?: number;
      max_rating?: number;
      alert_threshold?: number;
      limit?: number;
      save?: boolean;
    }
  >({
    mutationFn: async (params) => {
      const searchParams = new URLSearchParams();
      if (params.country_id)
        searchParams.set("country_id", String(params.country_id));
      if (params.category_id)
        searchParams.set("category_id", String(params.category_id));
      if (params.min_rating_count)
        searchParams.set("min_rating_count", String(params.min_rating_count));
      if (params.max_rating)
        searchParams.set("max_rating", String(params.max_rating));
      if (params.alert_threshold)
        searchParams.set("alert_threshold", String(params.alert_threshold));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.save !== undefined)
        searchParams.set("save", String(params.save));

      return authFetch<ODEScanResponse>(
        `/ode/opportunities/scan?${searchParams}`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ode"] });
    },
  });
}

// Acknowledge Alert (mutation)
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; alert_id: number }, Error, number>({
    mutationFn: async (alertId) => {
      return authFetch<{ status: string; alert_id: number }>(
        `/ode/alerts/${alertId}/acknowledge`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ode", "alerts"] });
    },
  });
}

// Resolve Alert (mutation)
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; alert_id: number }, Error, number>({
    mutationFn: async (alertId) => {
      return authFetch<{ status: string; alert_id: number }>(
        `/ode/alerts/${alertId}/resolve`,
        { method: "POST" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ode", "alerts"] });
    },
  });
}
