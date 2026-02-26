"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function QuickDiscoveryWidget() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setIsSearching(true);
    try {
      router.push(`/dashboard/discover?term=${encodeURIComponent(keyword.trim())}`);
    } catch (error) {
      console.error("Failed to navigate:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const quickSuggestions = [
    "fitness app",
    "meditation",
    "productivity",
    "language learning",
    "photo editor",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Discovery</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Search Keyword
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a keyword..."
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
              />
              <Button
                onClick={handleSearch}
                disabled={!keyword.trim() || isSearching}
                size="default"
                variant="primary"
              >
                {isSearching ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Searching...
                  </>
                ) : (
                  <>
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Quick suggestions:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setKeyword(suggestion)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-900/5 dark:border-white/5">
            <Button
              onClick={() => router.push("/dashboard/discover")}
              variant="outline"
              size="sm"
              className="w-full"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Advanced Discovery
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
