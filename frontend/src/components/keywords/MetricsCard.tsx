"use client";

interface MetricsCardProps {
  popularityScore: number;
  difficultyScore: number;
  opportunityScore: number;
  totalResults: number;
  hintAvailable: boolean;
  className?: string;
}

function getBarColor(score: number, inverted: boolean = false): string {
  if (inverted) {
    // For difficulty: low is good (blue), high is bad (red)
    if (score < 30) return "bg-blue-500";
    if (score < 60) return "bg-yellow-500";
    return "bg-red-500";
  }
  // For popularity/opportunity: high is good
  if (score >= 70) return "bg-blue-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

interface MetricBoxProps {
  label: string;
  value: number;
  maxValue?: number;
  showBar?: boolean;
  inverted?: boolean;
  suffix?: string;
}

function MetricBox({ label, value, maxValue = 100, showBar = true, inverted = false, suffix }: MetricBoxProps) {
  const barColor = getBarColor(value, inverted);
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
        {suffix ? value.toLocaleString() : Math.round(value)}
        {suffix && <span className="text-lg font-normal text-zinc-500 ml-1">{suffix}</span>}
      </div>
      {showBar && (
        <div className="mt-3 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function MetricsCard({
  popularityScore,
  difficultyScore,
  opportunityScore,
  totalResults,
  hintAvailable,
  className = "",
}: MetricsCardProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Keyword Intelligence
        </h3>
        {hintAvailable && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Apple Recognized
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox
          label="Popularity"
          value={popularityScore}
        />
        <MetricBox
          label="Competitiveness"
          value={difficultyScore}
          inverted
        />
        <MetricBox
          label="Opportunity"
          value={opportunityScore}
        />
        <MetricBox
          label="Results"
          value={totalResults}
          maxValue={200}
          showBar={false}
        />
      </div>
    </div>
  );
}
