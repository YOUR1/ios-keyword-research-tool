"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-api";
import { UsageInfo } from "@/types";

export function useUsage() {
  return useQuery<UsageInfo>({
    queryKey: ["usage"],
    queryFn: () => authFetch<UsageInfo>("/billing/usage"),
    staleTime: 60_000, // Cache for 1 minute
  });
}
