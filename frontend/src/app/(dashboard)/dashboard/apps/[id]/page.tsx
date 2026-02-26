"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Sparkles, Loader2, RefreshCw } from "lucide-react";
import RatingChart from "@/components/RatingChart";
import ReviewList from "@/components/ReviewList";
import { AppDetail, RatingHistoryItem } from "@/types";
import { authFetch } from "@/lib/auth-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface AIAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  mvp_recommendations: string[];
  what_to_do: string[];
  what_not_to_do: string[];
}

interface AnalysisResponse {
  analysis: AIAnalysis | null;
}

export default function DashboardAppDetailPage() {
  const params = useParams();
  const appId = Number(params.id);
  const queryClient = useQueryClient();

  const { data: app, isLoading, error } = useQuery<AppDetail>({
    queryKey: ["app", appId],
    queryFn: () => authFetch<AppDetail>(`/apps/${appId}`),
    enabled: appId > 0,
  });

  const { data: history = [] } = useQuery<RatingHistoryItem[]>({
    queryKey: ["appHistory", appId],
    queryFn: () => authFetch<RatingHistoryItem[]>(`/apps/${appId}/history`).catch(() => []),
    enabled: appId > 0,
  });

  // Fetch existing analysis on page load
  const { data: analysisData, isLoading: analysisLoading } = useQuery<AnalysisResponse>({
    queryKey: ["appAnalysis", appId],
    queryFn: () => authFetch<AnalysisResponse>(`/apps/${appId}/analysis`),
    enabled: appId > 0,
  });

  const analysis = analysisData?.analysis;

  const analyzeMutation = useMutation({
    mutationFn: async (regenerate: boolean = false) => {
      const url = regenerate
        ? `/apps/${appId}/analyze?regenerate=true`
        : `/apps/${appId}/analyze`;
      const result = await authFetch<AIAnalysis>(url, {
        method: "POST",
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appAnalysis", appId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-5 w-32" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Skeleton className="w-24 h-24 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center">
                <Skeleton className="h-3 w-20 mx-auto mb-2" />
                <Skeleton className="h-6 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 text-lg">
          {error instanceof Error ? error.message : "App not found"}
        </p>
        <Link href="/dashboard/results" className="mt-4 inline-block text-red-500 underline">
          Back to results
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard/results"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-red-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to results
      </Link>

      {/* App Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {app.icon_url ? (
              <Image
                src={app.icon_url}
                alt={app.name}
                className="rounded-2xl shadow-lg"
                width={96}
                height={96}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-3xl text-zinc-400">
                ?
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {app.name}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                {app.developer || "Unknown Developer"}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {app.category && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {app.category.name}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {app.country.code}
                </span>
                {app.content_rating && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {app.content_rating}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                onClick={() => analyzeMutation.mutate(!!analysis)}
                disabled={analyzeMutation.isPending}
                className={analysis
                  ? "bg-zinc-600 hover:bg-zinc-700 text-white"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                }
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : analysis ? (
                  <RefreshCw className="w-4 h-4 mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {analysis ? "Regenerate Analysis" : "AI Analysis"}
              </Button>
              {app.store_url && (
                <a
                  href={app.store_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors text-center"
                >
                  View on App Store
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {analyzeMutation.isPending && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              <p className="text-purple-700 dark:text-purple-300">
                Analyzing app reviews, description, and ratings...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {analyzeMutation.isError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">
              Failed to generate analysis. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Summary
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                {analysis.summary}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div>
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                  Strengths
                </h3>
                <ul className="space-y-1">
                  {analysis.strengths.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div>
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                  Weaknesses
                </h3>
                <ul className="space-y-1">
                  {analysis.weaknesses.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Opportunities */}
            <div>
              <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                Market Opportunities
              </h3>
              <ul className="space-y-1">
                {analysis.opportunities.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">*</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* MVP Recommendations */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                MVP Recommendations
              </h3>
              <ul className="space-y-1">
                {analysis.mvp_recommendations.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                    <span className="text-purple-500 font-bold mt-0.5">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* What TO Do */}
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                  What TO Do
                </h3>
                <ul className="space-y-1">
                  {analysis.what_to_do.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* What NOT To Do */}
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  What NOT To Do
                </h3>
                <ul className="space-y-1">
                  {analysis.what_not_to_do.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">&#10007;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Average Rating"
          value={app.average_rating?.toFixed(2) ?? "N/A"}
          color={
            app.average_rating !== null && app.average_rating < 2
              ? "text-red-500"
              : app.average_rating !== null && app.average_rating < 3
              ? "text-orange-500"
              : "text-zinc-900 dark:text-zinc-100"
          }
        />
        <StatCard
          label="Total Reviews"
          value={app.rating_count.toLocaleString()}
        />
        <StatCard
          label="Weighted Score"
          value={app.weighted_score?.toFixed(3) ?? "N/A"}
          color={
            app.weighted_score !== null && app.weighted_score < 2
              ? "text-red-500"
              : app.weighted_score !== null && app.weighted_score < 3
              ? "text-orange-500"
              : "text-zinc-900 dark:text-zinc-100"
          }
        />
        <StatCard
          label="Price"
          value={
            app.price === 0
              ? "Free"
              : `${app.currency} ${app.price.toFixed(2)}`
          }
        />
      </div>

      {/* Rating History Chart */}
      {history.length > 0 && <RatingChart data={history} />}

      {/* Customer Reviews */}
      <ReviewList appId={appId} />

      {/* Description */}
      {app.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionCollapsible text={app.description} />
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">iTunes ID</dt>
              <dd className="font-mono text-zinc-900 dark:text-zinc-100">{app.itunes_id}</dd>
            </div>
            {app.bundle_id && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Bundle ID</dt>
                <dd className="font-mono text-zinc-900 dark:text-zinc-100">{app.bundle_id}</dd>
              </div>
            )}
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Version</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{app.current_version || "\u2014"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Release Date</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{app.release_date || "\u2014"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Last Updated</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {app.updated_date ? new Date(app.updated_date).toLocaleDateString() : "\u2014"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">First Indexed</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {new Date(app.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
        <p className={`text-xl font-bold ${color || "text-zinc-900 dark:text-zinc-100"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DescriptionCollapsible({ text }: { text: string }) {
  const lines = text.split("\n");
  const isLong = lines.length > 3 || text.length > 300;

  if (!isLong) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line text-sm leading-relaxed">
        {text}
      </p>
    );
  }

  return (
    <Collapsible>
      <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line text-sm leading-relaxed line-clamp-3">
        {text}
      </div>
      <CollapsibleContent>
        <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line text-sm leading-relaxed mt-2">
          {text}
        </p>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-2 text-red-500 hover:text-red-600">
          Show more
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}
