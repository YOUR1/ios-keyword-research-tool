"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useKeyword, useTriggerCrawl, useExpandKeyword, useUpdateKeyword } from "@/hooks/useKeywords";
import { useResults } from "@/hooks/useResults";
import { useCrawlJobs } from "@/hooks/useCrawlJobs";
import { useAnalyzeKeyword, useKeywordMetricsHistory } from "@/hooks/useKeywordResearch";
import CrawlStatusBadge from "@/components/dashboard/CrawlStatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { MetricsCard, TopAppsTable, MetricsChart, RelatedKeywords } from "@/components/keywords";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useState, useCallback } from "react";
import { KeywordAnalysis, CrawlJob } from "@/types";
import { authFetch } from "@/lib/auth-api";
import { useQueryClient } from "@tanstack/react-query";

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-zinc-400">N/A</span>;
  const full = Math.floor(rating);
  const partial = rating - full;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i <= full
                ? "text-amber-400"
                : i === full + 1 && partial > 0
                ? "text-amber-400/50"
                : "text-zinc-300 dark:text-zinc-600"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-zinc-600 dark:text-zinc-400 ml-1">
        {rating.toFixed(2)}
      </span>
    </div>
  );
}

export default function KeywordDetailPage() {
  const params = useParams();
  const keywordId = Number(params.id);
  const [resultsPage, setResultsPage] = useState(1);
  const [crawlsPage, setCrawlsPage] = useState(1);
  const [editingSubKeywords, setEditingSubKeywords] = useState(false);
  const [newSubKeyword, setNewSubKeyword] = useState("");
  const [analysisData, setAnalysisData] = useState<KeywordAnalysis | null>(null);
  const [researchStatus, setResearchStatus] = useState<"idle" | "crawling" | "analyzing">("idle");

  const queryClient = useQueryClient();
  const { data: keyword, isLoading: keywordLoading, error: keywordError } = useKeyword(keywordId);
  const expandKeyword = useExpandKeyword();
  const updateKeyword = useUpdateKeyword();
  const analyzeKeyword = useAnalyzeKeyword();
  const { data: metricsHistory } = useKeywordMetricsHistory(keywordId, 30);
  const { data: results, isLoading: resultsLoading } = useResults({
    keyword_id: keywordId,
    page: resultsPage,
    page_size: 10,
  });
  const { data: crawlJobs, isLoading: crawlsLoading } = useCrawlJobs({
    keyword_id: keywordId,
    page: crawlsPage,
    page_size: 10,
  });
  const triggerCrawl = useTriggerCrawl();

  const handleAnalyze = async (forceRefresh: boolean = false) => {
    try {
      const result = await analyzeKeyword.mutateAsync({ keywordId, forceRefresh });
      setAnalysisData(result);
    } catch (error) {
      console.error("Failed to analyze keyword:", error);
    }
  };

  const pollJobStatus = useCallback(async (jobId: number): Promise<CrawlJob> => {
    const poll = async (): Promise<CrawlJob> => {
      const job = await authFetch<CrawlJob>(`/crawls/${jobId}`);
      if (job.status === "completed" || job.status === "failed") {
        return job;
      }
      // Wait 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return poll();
    };
    return poll();
  }, []);

  const handleResearch = async () => {
    try {
      // Step 1: Trigger crawl
      setResearchStatus("crawling");
      const crawlJob = await triggerCrawl.mutateAsync(keywordId);

      // Step 2: Wait for crawl to complete
      await pollJobStatus(crawlJob.id);

      // Refresh data after crawl completes
      queryClient.invalidateQueries({ queryKey: ["results"] });
      queryClient.invalidateQueries({ queryKey: ["crawlJobs"] });
      queryClient.invalidateQueries({ queryKey: ["keyword", keywordId] });

      // Step 3: Run analysis with fresh data
      setResearchStatus("analyzing");
      await handleAnalyze(true);
    } catch (error) {
      console.error("Research failed:", error);
    } finally {
      setResearchStatus("idle");
    }
  };

  const isResearching = researchStatus !== "idle";

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

      {/* Keyword Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {keyword.term}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {keyword.country_code}
                </span>
                <span className="capitalize">{keyword.crawl_frequency}</span>
                <Badge variant={keyword.is_active ? "success" : "secondary"}>
                  {keyword.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
            </div>
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
              {researchStatus === "crawling" ? "Crawling..." : researchStatus === "analyzing" ? "Analyzing..." : "Research"}
            </Button>
          </div>

          {/* Metadata grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-900/5 dark:border-white/5">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Created</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {new Date(keyword.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Last Crawled</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {keyword.last_crawled_at
                  ? new Date(keyword.last_crawled_at).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Apps Found</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {keyword.total_apps_found}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Crawls</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {keyword.total_crawl_jobs}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Keywords Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">AI-Expanded Keywords</CardTitle>
              <CardDescription className="mt-1">
                {keyword.expansion_enabled
                  ? "These related terms are searched during crawls to find more apps"
                  : "Keyword expansion is disabled - only the main term is searched"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {keyword.expansion_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => expandKeyword.mutate(keywordId)}
                  disabled={expandKeyword.isPending}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {expandKeyword.isPending ? "Regenerating..." : "Regenerate"}
                </Button>
              )}
              <Button
                variant={keyword.expansion_enabled ? "primary" : "secondary"}
                size="sm"
                onClick={() =>
                  updateKeyword.mutate({
                    id: keywordId,
                    data: { expansion_enabled: !keyword.expansion_enabled },
                  })
                }
                disabled={updateKeyword.isPending}
              >
                {keyword.expansion_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {keyword.expansion_enabled && (
          <CardContent>
            {/* Sub-keywords list */}
            <div className="flex flex-wrap gap-2 mb-4">
              {keyword.sub_keywords && keyword.sub_keywords.length > 0 ? (
                keyword.sub_keywords.map((subKw, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="px-3 py-1.5 gap-1.5"
                  >
                    {subKw}
                    {editingSubKeywords && (
                      <button
                        onClick={() => {
                          const newList = keyword.sub_keywords?.filter((_, i) => i !== idx) || [];
                          updateKeyword.mutate({
                            id: keywordId,
                            data: { sub_keywords: newList },
                          });
                        }}
                        className="ml-1 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                  No sub-keywords yet. Click &quot;Regenerate&quot; to generate them using AI.
                </p>
              )}
            </div>

            {/* Edit controls */}
            <div className="flex items-center gap-2 pt-3 border-t border-zinc-900/5 dark:border-white/5">
              {editingSubKeywords ? (
                <>
                  <Input
                    type="text"
                    value={newSubKeyword}
                    onChange={(e) => setNewSubKeyword(e.target.value)}
                    placeholder="Add a sub-keyword"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubKeyword.trim()) {
                        const newList = [...(keyword.sub_keywords || []), newSubKeyword.trim()];
                        updateKeyword.mutate({
                          id: keywordId,
                          data: { sub_keywords: newList },
                        });
                        setNewSubKeyword("");
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (newSubKeyword.trim()) {
                        const newList = [...(keyword.sub_keywords || []), newSubKeyword.trim()];
                        updateKeyword.mutate({
                          id: keywordId,
                          data: { sub_keywords: newList },
                        });
                        setNewSubKeyword("");
                      }
                    }}
                    disabled={!newSubKeyword.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSubKeywords(false);
                      setNewSubKeyword("");
                    }}
                  >
                    Done
                  </Button>
                </>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setEditingSubKeywords(true)}
                  className="px-0"
                >
                  Edit Sub-Keywords
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Keyword Research Section */}
      {(analysisData || keyword.latest_popularity !== null) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Keyword Research
            </h2>
            {analysisData && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Badge variant={analysisData.data_source === "database" ? "secondary" : "info"}>
                  {analysisData.data_source === "database" ? "Cached" : "Fresh"}
                </Badge>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleAnalyze(true)}
                  disabled={analyzeKeyword.isPending}
                  className="px-0"
                >
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {/* Metrics Card */}
          {analysisData ? (
            <MetricsCard
              popularityScore={analysisData.popularity_score}
              difficultyScore={analysisData.difficulty_score}
              opportunityScore={analysisData.opportunity_score}
              totalResults={analysisData.total_results}
              hintAvailable={analysisData.hint_available}
            />
          ) : keyword.latest_popularity !== null && (
            <MetricsCard
              popularityScore={keyword.latest_popularity}
              difficultyScore={keyword.latest_difficulty ?? 0}
              opportunityScore={keyword.latest_opportunity ?? 0}
              totalResults={0}
              hintAvailable={false}
            />
          )}

          {/* Top Apps Table */}
          {analysisData && analysisData.top_apps.length > 0 && (
            <TopAppsTable
              apps={analysisData.top_apps}
              keyword={analysisData.term}
              titleMatchCount={analysisData.title_match_count}
              subtitleMatchCount={analysisData.subtitle_match_count}
            />
          )}

          {/* Metrics History Chart */}
          {metricsHistory && metricsHistory.items.length > 0 && (
            <MetricsChart data={metricsHistory.items} />
          )}

          {/* Related Keywords */}
          {analysisData && analysisData.related_hints.length > 0 && (
            <RelatedKeywords hints={analysisData.related_hints} />
          )}
        </div>
      )}

      {/* Prompt to research if no data yet */}
      {!analysisData && keyword.latest_popularity === null && (
        <Card className="bg-zinc-50 dark:bg-zinc-900/50">
          <CardContent className="py-8 text-center">
            <svg className="w-12 h-12 mx-auto text-zinc-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
              No keyword data yet
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Click &quot;Research&quot; to crawl apps and calculate metrics for this keyword.
            </p>
            <Button
              onClick={handleResearch}
              disabled={isResearching}
              variant="primary"
            >
              {isResearching && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {researchStatus === "crawling" ? "Crawling..." : researchStatus === "analyzing" ? "Analyzing..." : "Research Keyword"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Apps Found */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
          Apps Found
        </h2>
        {resultsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : results && results.items.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Reviews</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.items.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/apps/${app.id}`}
                        className="flex items-center gap-3 group"
                      >
                        {app.icon_url ? (
                          <img
                            src={app.icon_url}
                            alt={app.name}
                            className="w-10 h-10 rounded-xl ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 flex items-center justify-center text-zinc-400">
                            ?
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                            {app.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {app.developer || "Unknown Developer"}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
                      {app.category_name || "--"}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={app.average_rating} />
                    </TableCell>
                    <TableCell className="text-right">
                      {app.rating_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {app.price === 0 ? (
                        <Badge variant="success">Free</Badge>
                      ) : (
                        `${app.currency} ${app.price.toFixed(2)}`
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {results.total_pages > 1 && (
              <CardFooter className="justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Page {results.page} of {results.total_pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                    disabled={results.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResultsPage((p) => p + 1)}
                    disabled={results.page >= results.total_pages}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        ) : (
          <EmptyState
            title="No apps found yet"
            message="Trigger a crawl to discover apps for this keyword."
            actionLabel="Crawl Now"
            onAction={() => triggerCrawl.mutate(keywordId)}
          />
        )}
      </div>

      {/* Crawl History */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">
          Crawl History
        </h2>
        {crawlsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : crawlJobs && crawlJobs.items.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Apps Found</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">New Apps</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Duration</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crawlJobs.items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <CrawlStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {job.apps_found}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {job.apps_new}
                    </TableCell>
                    <TableCell className="text-right text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                      {job.duration_seconds !== null
                        ? `${job.duration_seconds.toFixed(1)}s`
                        : "--"}
                    </TableCell>
                    <TableCell className="text-zinc-500 dark:text-zinc-400">
                      {job.started_at
                        ? new Date(job.started_at).toLocaleString()
                        : "Pending"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {crawlJobs.total_pages > 1 && (
              <CardFooter className="justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Page {crawlJobs.page} of {crawlJobs.total_pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCrawlsPage((p) => Math.max(1, p - 1))}
                    disabled={crawlJobs.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCrawlsPage((p) => p + 1)}
                    disabled={crawlJobs.page >= crawlJobs.total_pages}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No crawl history yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
