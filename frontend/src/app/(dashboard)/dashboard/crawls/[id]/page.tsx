"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { useCrawlJob, useCrawlJobLogs } from "@/hooks/useCrawlJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CrawlStatusBadge from "@/components/dashboard/CrawlStatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { CrawlJobLog, CrawlPhase, LogLevel } from "@/types";

// Phase badge colors
const PHASE_STYLES: Record<CrawlPhase, string> = {
  init: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
  search: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  lookup: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  scoring: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  storage: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

// Log level colors for terminal display
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: "text-zinc-200",
  warning: "text-yellow-400",
  error: "text-red-400",
  debug: "text-zinc-500",
};

function PhaseBadge({ phase }: { phase: CrawlPhase }) {
  const style = PHASE_STYLES[phase] || PHASE_STYLES.init;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${style}`}
    >
      {phase}
    </span>
  );
}

function LogEntry({ log }: { log: CrawlJobLog }) {
  const timestamp = new Date(log.created_at).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const levelColor = LOG_LEVEL_COLORS[log.level as LogLevel] || LOG_LEVEL_COLORS.info;

  return (
    <div className="flex items-start gap-3 py-1 font-mono text-sm">
      <span className="text-zinc-500 shrink-0">[{timestamp}]</span>
      <PhaseBadge phase={log.phase as CrawlPhase} />
      <span className={levelColor}>{log.message}</span>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Progress
        </span>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}

export default function CrawlDetailPage() {
  const params = useParams();
  const crawlId = Number(params.id);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { data: job, isLoading: jobLoading, error: jobError } = useCrawlJob(crawlId);

  const { data: logsData, isLoading: logsLoading } = useCrawlJobLogs(
    { job_id: crawlId, limit: 500 },
    job?.status
  );

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (logContainerRef.current && logsData?.items) {
      const container = logContainerRef.current;
      // Only auto-scroll if user is near the bottom
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logsData?.items]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/crawls"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to crawl history
        </Link>
        <Card className="border-red-500/20 bg-red-50 dark:bg-red-900/10">
          <CardContent className="py-6 text-red-600 dark:text-red-400">
            {jobError instanceof Error ? jobError.message : "Crawl job not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRunning = job.status === "running" || job.status === "pending";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/crawls"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-500 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to crawl history
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Crawl #{job.id}
            </h1>
            <CrawlStatusBadge status={job.status} />
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            Keyword: <span className="font-medium text-zinc-700 dark:text-zinc-300">{job.keyword_term || "Unknown"}</span>
          </p>
        </div>
        {isRunning && (
          <Badge variant="info" className="animate-pulse">
            Live updating
          </Badge>
        )}
      </div>

      {/* Progress bar (only when running and progress available) */}
      {isRunning && (() => {
        // Get the latest progress from logs
        const latestProgress = logsData?.items
          ?.filter((log) => log.progress !== null)
          ?.slice(-1)[0]?.progress;
        return latestProgress !== null && latestProgress !== undefined ? (
          <Card>
            <CardContent className="pt-6">
              <ProgressBar progress={latestProgress} />
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Stats Grid */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              label="Apps Found"
              value={job.apps_found}
              color={job.apps_found > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
            />
            <StatCard
              label="New Apps"
              value={job.apps_new}
              color={job.apps_new > 0 ? "text-blue-600 dark:text-blue-400" : undefined}
            />
            <StatCard
              label="Duration"
              value={
                job.duration_seconds !== null
                  ? `${job.duration_seconds.toFixed(1)}s`
                  : isRunning
                  ? "Running..."
                  : "--"
              }
            />
            <StatCard
              label="Proxy"
              value={job.proxy_used || "None"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {new Date(job.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Started</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {job.started_at ? new Date(job.started_at).toLocaleString() : "--"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Completed</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {job.completed_at ? new Date(job.completed_at).toLocaleString() : "--"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Keyword ID</dt>
              <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                {job.keyword_id}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Error message if failed */}
      {job.status === "failed" && job.error_message && (
        <Card className="border-red-500/20 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 text-base">
              Error Message
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-red-600 dark:text-red-400 font-mono text-sm">
              {job.error_message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Log viewer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Crawl Logs
            {logsData?.total !== undefined && (
              <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                ({logsData.total} entries)
              </span>
            )}
          </CardTitle>
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Polling every 2s
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div
            ref={logContainerRef}
            className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-4 h-[400px] overflow-y-auto overflow-x-auto"
          >
            {logsLoading && !logsData ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : logsData?.items && logsData.items.length > 0 ? (
              <div className="space-y-0.5">
                {logsData.items.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                {isRunning ? "Waiting for logs..." : "No logs available"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
