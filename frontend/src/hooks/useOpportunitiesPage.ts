"use client";

import { useTopOpportunities, useODEAlertSummary, useODEAlerts, useDiscoverKeywords, useODEStatus } from "@/hooks/useODE";

export function useOpportunitiesPage() {
  const { data: status, isLoading: statusLoading } = useODEStatus();
  const { data: opportunities, isLoading: oppsLoading } = useTopOpportunities(20);
  const { data: alertSummary, isLoading: summaryLoading } = useODEAlertSummary(24);
  const { data: recentAlerts, isLoading: alertsLoading } = useODEAlerts(5);

  return {
    status,
    opportunities,
    alertSummary,
    recentAlerts,
    isLoading: statusLoading || oppsLoading || summaryLoading || alertsLoading,
  };
}
