"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import RatingChart from "@/components/RatingChart";
import ReviewList from "@/components/ReviewList";
import { AppDetail, RatingHistoryItem } from "@/types";
import { getApp, getAppHistory } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
        <p className="text-red-500 text-lg">{error || "App not found"}</p>
        <Link href="/" className="mt-4 inline-block text-red-500 underline">
          Back to index
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-red-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to rankings
      </Link>

      {/* App Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
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
            {app.store_url && (
              <a
                href={app.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors shrink-0"
              >
                View on App Store
              </a>
            )}
          </div>
        </CardContent>
      </Card>

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
