"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { useKeyword, useTriggerCrawl } from "@/hooks/useKeywords";
import { useKeywordAnalysis, useAnalyzeKeyword } from "@/hooks/useKeywordResearch";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  KeywordTabs,
  TabId,
  InspectorTab,
  RelatedTab,
  HistoryTab,
  CollapsibleProjectSettings,
} from "@/components/keywords";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrawlJob } from "@/types";
import { authFetch } from "@/lib/auth-api";
import { useQueryClient } from "@tanstack/react-query";

export default function KeywordDetailPage() {
  const params = useParams();
  const keywordId = Number(params.id);
  const queryClient = useQueryClient();

  // Tab state with URL hash support
  const [activeTab, setActiveTab] = useState<TabId>("inspector");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isResearching, setIsResearching] = useState(false);

  // Track if keyword is still being set up (no last_crawled_at means initial setup in progress)
  const [isSettingUp, setIsSettingUp] = useState(true);

  const { data: keyword, isLoading: keywordLoading, error: keywordError } = useKeyword(
    keywordId,
    { refetchInterval: isSettingUp ? 3000 : false }
  );

  // Use query hook for analysis data (read-only, fetches from stored data)
  const { data: analysisData, isLoading: analysisLoading } = useKeywordAnalysis(keywordId, {
    // Only fetch analysis after keyword setup is complete
    enabled: !isSettingUp && keyword?.latest_popularity !== null,
  });

  const triggerCrawl = useTriggerCrawl();
  const analyzeKeyword = useAnalyzeKeyword();

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // Sync tab state with URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1) as TabId;
    if (["inspector", "related", "history"].includes(hash)) {
      setActiveTab(hash);
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1) as TabId;
      if (["inspector", "related", "history"].includes(newHash)) {
        setActiveTab(newHash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update setting up state based on keyword data
  useEffect(() => {
    if (keyword) {
      const stillSettingUp = !keyword.last_crawled_at;
      setIsSettingUp(stillSettingUp);
    }
  }, [keyword]);

  const pollJobStatus = useCallback(async (jobId: number): Promise<CrawlJob> => {
    const poll = async (): Promise<CrawlJob> => {
      const job = await authFetch<CrawlJob>(`/crawls/${jobId}`);
      if (job.status === "completed" || job.status === "failed") {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return poll();
    };
    return poll();
  }, []);

  const handleResearch = async () => {
    try {
      setIsResearching(true);
      const crawlJob = await triggerCrawl.mutateAsync(keywordId);

      // Poll until crawl completes - the backend task handles crawl + analysis
      const completedJob = await pollJobStatus(crawlJob.id);

      if (completedJob.status === "failed") {
        console.error("Crawl job failed:", completedJob.error_message);
        return;
      }

      // Backend already computed analysis during crawl task.
      // Just invalidate queries so React Query refetches the stored data.
      queryClient.invalidateQueries({ queryKey: ["keywordAnalysis", keywordId] });
      queryClient.invalidateQueries({ queryKey: ["keyword", keywordId] });
      queryClient.invalidateQueries({ queryKey: ["keywordMetricsHistory", keywordId] });
      queryClient.invalidateQueries({ queryKey: ["crawlJobs"] });
    } catch (error) {
      console.error("Research failed:", error);
    } finally {
      setIsResearching(false);
    }
  };

  // Handler for triggering fresh analysis (used by InspectorTab refresh button)
  const handleAnalyze = useCallback(async (forceRefresh: boolean = false) => {
    const result = await analyzeKeyword.mutateAsync({ keywordId, forceRefresh });
    return result;
  }, [analyzeKeyword, keywordId]);

  if (keywordLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (keywordError || !keyword) {
    return (
      <Card className="border-red-500/20 bg-red-50 dark:bg-red-900/10">
        <CardContent className="py-6 text-red-600 dark:text-red-400">
          Keyword not found or failed to load.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href="/dashboard/keywords"
          className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
        >
          Projects
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-white">{keyword.term}</span>
      </div>

      {/* Setting Up Banner */}
      {isSettingUp && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Setting up your keyword...
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                We&apos;re crawling the App Store and analyzing results for &quot;{keyword.term}&quot;. This usually takes a minute.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Keyword Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {keyword.term}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {keyword.country_code}
            </span>
            <Badge variant={keyword.is_active ? "success" : "secondary"}>
              {keyword.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings gear icon */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={settingsOpen ? "bg-zinc-100 dark:bg-zinc-800" : ""}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Button>

          {/* Research button */}
          <Button
            onClick={handleResearch}
            disabled={isResearching}
            variant="primary"
          >
            {isResearching ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {isResearching ? "Researching..." : "Research"}
          </Button>
        </div>
      </div>

      {/* Collapsible Project Settings */}
      {settingsOpen && (
        <CollapsibleProjectSettings
          keyword={keyword}
          isOpen={settingsOpen}
          onToggle={() => setSettingsOpen(!settingsOpen)}
        />
      )}

      {/* Tab Navigation */}
      <KeywordTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "inspector" && (
          <InspectorTab
            analysisData={analysisData ?? null}
            keyword={keyword}
            onAnalyze={handleAnalyze}
            isAnalyzing={analyzeKeyword.isPending || analysisLoading}
          />
        )}

        {activeTab === "related" && (
          <RelatedTab
            relatedKeywords={analysisData?.related_keywords || []}
            aiExpandedKeywords={analysisData?.ai_expanded_keywords || []}
            keywordId={keywordId}
            countryCode={keyword.country_code}
            isResearched={keyword.latest_popularity !== null}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab keywordId={keywordId} />
        )}
      </div>
    </div>
  );
}
