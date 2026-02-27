"use client";

import { KeywordAnalysis, Keyword } from "@/types";
import TopAppsTable from "../TopAppsTable";

interface InspectorTabProps {
  analysisData: KeywordAnalysis | null;
  keyword: Keyword;
  onAnalyze: (forceRefresh: boolean) => Promise<void | KeywordAnalysis | null>;
  isAnalyzing: boolean;
}

function getBarColor(score: number, inverted: boolean = false): string {
  if (inverted) {
    if (score < 30) return "bg-blue-500";
    if (score < 60) return "bg-yellow-500";
    return "bg-red-500";
  }
  if (score >= 70) return "bg-blue-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

interface CompactMetricProps {
  label: string;
  value: number;
  inverted?: boolean;
  showBar?: boolean;
}

function CompactMetric({ label, value, inverted = false, showBar = true }: CompactMetricProps) {
  const barColor = getBarColor(value, inverted);
  const percentage = Math.min((value / 100) * 100, 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex flex-col min-w-[80px]">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{Math.round(value)}</span>
      </div>
      {showBar && (
        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden min-w-[60px]">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState({ keyword, onAnalyze, isAnalyzing }: { keyword: Keyword; onAnalyze: (forceRefresh: boolean) => Promise<void | KeywordAnalysis | null>; isAnalyzing: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-12">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          No analysis data yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">
          Analyze &quot;{keyword.term}&quot; to see popularity, competitiveness, and top-ranking apps for this keyword.
        </p>
        <button
          onClick={() => onAnalyze(false)}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
        >
          {isAnalyzing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analyze Keyword
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function InspectorTab({ analysisData, keyword, onAnalyze, isAnalyzing }: InspectorTabProps) {
  if (!analysisData) {
    return <EmptyState keyword={keyword} onAnalyze={onAnalyze} isAnalyzing={isAnalyzing} />;
  }

  return (
    <div className="space-y-6">
      {/* Compact Metrics Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center divide-x divide-zinc-200 dark:divide-zinc-700">
            <CompactMetric
              label="Popularity"
              value={analysisData.popularity_score}
            />
            <CompactMetric
              label="Competitiveness"
              value={analysisData.difficulty_score}
              inverted
            />
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="flex flex-col min-w-[80px]">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Results</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {analysisData.total_results.toLocaleString()}
                </span>
              </div>
            </div>
            {analysisData.hint_available && (
              <div className="flex items-center px-4 py-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Apple Recognized
                </span>
              </div>
            )}
          </div>

          <div className="px-4 py-2">
            <button
              onClick={() => onAnalyze(true)}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top Apps Table */}
      <TopAppsTable
        apps={analysisData.top_apps}
        keyword={analysisData.term}
        titleMatchCount={analysisData.title_match_count}
        subtitleMatchCount={analysisData.subtitle_match_count}
      />
    </div>
  );
}
