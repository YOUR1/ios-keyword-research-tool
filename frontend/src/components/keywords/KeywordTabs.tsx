"use client";

import { useEffect, useState } from "react";

export type TabId = "inspector" | "related" | "history";

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: "inspector", label: "Inspector" },
  { id: "related", label: "Related" },
  { id: "history", label: "History" },
];

interface KeywordTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function KeywordTabs({ activeTab, onTabChange }: KeywordTabsProps) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300 dark:hover:border-zinc-600"
                }
              `}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
