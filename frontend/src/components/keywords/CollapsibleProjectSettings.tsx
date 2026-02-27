"use client";

import { useState } from "react";
import { Keyword } from "@/types";
import { useExpandKeyword, useUpdateKeyword } from "@/hooks/useKeywords";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CollapsibleProjectSettingsProps {
  keyword: Keyword;
  isOpen: boolean;
  onToggle: () => void;
}

export function CollapsibleProjectSettings({
  keyword,
  isOpen,
  onToggle,
}: CollapsibleProjectSettingsProps) {
  const [editingSubKeywords, setEditingSubKeywords] = useState(false);
  const [newSubKeyword, setNewSubKeyword] = useState("");

  const expandKeyword = useExpandKeyword();
  const updateKeyword = useUpdateKeyword();

  const handleRemoveSubKeyword = (idx: number) => {
    const newList = keyword.sub_keywords?.filter((_, i) => i !== idx) || [];
    updateKeyword.mutate({
      id: keyword.id,
      data: { sub_keywords: newList },
    });
  };

  const handleAddSubKeyword = () => {
    if (newSubKeyword.trim()) {
      const newList = [...(keyword.sub_keywords || []), newSubKeyword.trim()];
      updateKeyword.mutate({
        id: keyword.id,
        data: { sub_keywords: newList },
      });
      setNewSubKeyword("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newSubKeyword.trim()) {
      handleAddSubKeyword();
    }
  };

  const handleToggleExpansion = () => {
    updateKeyword.mutate({
      id: keyword.id,
      data: { expansion_enabled: !keyword.expansion_enabled },
    });
  };

  const handleRegenerate = () => {
    expandKeyword.mutate(keyword.id);
  };

  return (
    <div className="border border-zinc-900/5 dark:border-white/5 rounded-lg">
      {/* Header with toggle trigger */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <div>
            <span className="font-medium text-zinc-900 dark:text-white">
              AI-Expanded Keywords
            </span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {keyword.expansion_enabled
                ? `${keyword.sub_keywords?.length || 0} sub-keywords active`
                : "Expansion disabled"}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="p-4 pt-0 space-y-4">
          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900/5 dark:border-white/5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {keyword.expansion_enabled
                ? "Related terms are searched during crawls to find more apps"
                : "Only the main term is searched"}
            </p>
            <div className="flex items-center gap-2">
              {keyword.expansion_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={expandKeyword.isPending}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {expandKeyword.isPending ? "Regenerating..." : "Regenerate"}
                </Button>
              )}
              <Button
                variant={keyword.expansion_enabled ? "primary" : "secondary"}
                size="sm"
                onClick={handleToggleExpansion}
                disabled={updateKeyword.isPending}
              >
                {keyword.expansion_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>

          {/* Sub-keywords list */}
          {keyword.expansion_enabled && (
            <>
              <div className="flex flex-wrap gap-2">
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
                          onClick={() => handleRemoveSubKeyword(idx)}
                          className="ml-1 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                    No sub-keywords yet. Click &quot;Regenerate&quot; to
                    generate them using AI.
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
                      onKeyDown={handleKeyDown}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddSubKeyword}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
