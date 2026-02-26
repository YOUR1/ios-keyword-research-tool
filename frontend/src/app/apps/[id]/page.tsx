"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ExternalLink, Star, TrendingDown, Calendar, Tag } from "lucide-react";
import RatingChart from "@/components/RatingChart";
import ReviewList from "@/components/ReviewList";
import { AppDetail, RatingHistoryItem } from "@/types";
import { getApp, getAppHistory } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export default function AppDetailPage() {
  const params = useParams();
  const appId = Number(params.id);

  const [app, setApp] = useState<AppDetail | null>(null);
  const [history, setHistory] = useState<RatingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;

    async function load() {
      setLoading(true);
      try {
        const [appData, historyData] = await Promise.all([
          getApp(appId),
          getAppHistory(appId).catch(() => []),
        ]);
        setApp(appData);
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load app");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [appId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-5 w-32" />
        <Card>
          <CardContent>
            <div className="flex items-start gap-6">
              <Skeleton className="w-24 h-24 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="text-center">
                <Skeleton className="h-4 w-20 mx-auto mb-2" />
                <Skeleton className="h-8 w-16 mx-auto" />
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
          <TrendingDown className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          {error || "App not found"}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          We couldn&apos;t load the app details. Please try again.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to rankings
        </Link>
      </div>
    );
  }

  const getRatingVariant = (rating: number | null): "destructive" | "warning" | "success" => {
    if (rating === null) return "warning";
    if (rating < 2) return "destructive";
    if (rating < 3) return "warning";
    return "success";
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to rankings
      </Link>

      {/* App Header */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {app.icon_url ? (
              <Image
                src={app.icon_url}
                alt={app.name}
                className="rounded-2xl ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10"
                width={96}
                height={96}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 ring-1 ring-inset ring-zinc-900/10 dark:ring-white/10 flex items-center justify-center">
                <span className="text-3xl text-zinc-400 dark:text-zinc-500">?</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white truncate">
                {app.name}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {app.developer || "Unknown Developer"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {app.category && (
                  <Badge variant="outline">
                    <Tag className="w-3 h-3" />
                    {app.category.name}
                  </Badge>
                )}
                <Badge variant="secondary">
                  {app.country.code}
                </Badge>
                {app.content_rating && (
                  <Badge variant="secondary">
                    {app.content_rating}
                  </Badge>
                )}
              </div>
            </div>
            {app.store_url && (
              <a
                href={app.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                View on App Store
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
              <Star className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1">
              Average Rating
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {app.average_rating?.toFixed(2) ?? "N/A"}
            </p>
            <Badge variant={getRatingVariant(app.average_rating)} className="mt-2">
              {app.average_rating !== null && app.average_rating < 2
                ? "Poor"
                : app.average_rating !== null && app.average_rating < 3
                ? "Fair"
                : "Good"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1">
              Total Reviews
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {app.rating_count.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
              <TrendingDown className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1">
              Weighted Score
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {app.weighted_score?.toFixed(3) ?? "N/A"}
            </p>
            <Badge variant={getRatingVariant(app.weighted_score)} className="mt-2">
              {app.weighted_score !== null && app.weighted_score < 2
                ? "Poor"
                : app.weighted_score !== null && app.weighted_score < 3
                ? "Fair"
                : "Good"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-1">
              Price
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {app.price === 0
                ? "Free"
                : `${app.currency} ${app.price.toFixed(2)}`}
            </p>
            {app.price === 0 && (
              <Badge variant="success" className="mt-2">
                Free
              </Badge>
            )}
          </CardContent>
        </Card>
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
            <CardDescription>App Store description and details</CardDescription>
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
          <CardDescription>Technical information and metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <DetailItem label="iTunes ID" value={app.itunes_id} mono />
            {app.bundle_id && (
              <DetailItem label="Bundle ID" value={app.bundle_id} mono />
            )}
            <DetailItem
              label="Version"
              value={app.current_version || "\u2014"}
            />
            <DetailItem
              label="Release Date"
              value={app.release_date || "\u2014"}
              icon={<Calendar className="w-4 h-4" />}
            />
            <DetailItem
              label="Last Updated"
              value={
                app.updated_date
                  ? new Date(app.updated_date).toLocaleDateString()
                  : "\u2014"
              }
              icon={<Calendar className="w-4 h-4" />}
            />
            <DetailItem
              label="First Indexed"
              value={new Date(app.created_at).toLocaleDateString()}
              icon={<Calendar className="w-4 h-4" />}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd
        className={`text-sm text-zinc-900 dark:text-white ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
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
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10"
        >
          Show more
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}
