"use client";

interface CrawlStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  running:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 animate-pulse",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  failed:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export default function CrawlStatusBadge({ status }: CrawlStatusBadgeProps) {
  const style =
    STATUS_STYLES[status] ||
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}
    >
      {status}
    </span>
  );
}
