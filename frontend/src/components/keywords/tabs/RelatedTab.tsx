"use client";

import { useMemo } from "react";
import RelatedKeywordsTable, {
  RelatedKeyword,
} from "@/components/keywords/RelatedKeywordsTable";
import { RelatedKeywordInfo } from "@/types";

interface RelatedTabProps {
  relatedKeywords: RelatedKeywordInfo[];
  aiExpandedKeywords: RelatedKeywordInfo[];
  keywordId: number;
  countryCode: string;
  isResearched: boolean;
}

// Convert API RelatedKeywordInfo to table RelatedKeyword format
function mapRelatedKeywordToTableFormat(rk: RelatedKeywordInfo): RelatedKeyword {
  return {
    term: rk.term,
    popularity: rk.popularity,
    competitiveness: rk.competitiveness,
    topApps: rk.top_apps?.map((app) => ({
      icon_url: app.icon_url || "",
      name: app.name,
    })) || [],
    source: rk.source || "apple",
  };
}

export default function RelatedTab({
  relatedKeywords,
  aiExpandedKeywords,
  isResearched,
}: RelatedTabProps) {
  // Combine Apple keywords and AI keywords into a single list
  const keywords = useMemo(() => {
    // Apple keywords from related_keywords
    const appleKeywords = relatedKeywords.map(mapRelatedKeywordToTableFormat);

    // AI keywords from ai_expanded_keywords (they now have full metrics)
    const aiKeywords = aiExpandedKeywords.map(mapRelatedKeywordToTableFormat);

    // Merge, avoiding duplicates (case-insensitive)
    const existingTerms = new Set(appleKeywords.map(k => k.term.toLowerCase()));
    const uniqueAIKeywords = aiKeywords.filter(
      k => !existingTerms.has(k.term.toLowerCase())
    );

    return [...appleKeywords, ...uniqueAIKeywords];
  }, [relatedKeywords, aiExpandedKeywords]);

  // Count keywords by source
  const appleCount = keywords.filter(k => k.source === "apple").length;
  const aiCount = keywords.filter(k => k.source === "ai").length;

  // Show message if keyword hasn't been researched yet
  if (!isResearched) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Related Keywords
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Discovered from Apple Search Hints + AI expansion
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Research this keyword first to see related keywords.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Click the &quot;Research&quot; button above to discover related keywords.
          </p>
        </div>
      </div>
    );
  }

  // No keywords at all
  if (keywords.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Related Keywords
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Discovered from Apple Search Hints + AI expansion
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">
          No related keywords found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Related Keywords
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {appleCount > 0 && `${appleCount} from Apple`}
            {appleCount > 0 && aiCount > 0 && " + "}
            {aiCount > 0 && `${aiCount} from AI`}
          </p>
        </div>
      </div>

      <RelatedKeywordsTable keywords={keywords} />
    </div>
  );
}
