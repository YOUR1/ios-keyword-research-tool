"use client";

import * as React from "react";
import { Logo } from "@/components/Logo";
import {
  TrendIndicator,
  OpportunityScoreBadge,
  UpdateFrequencyBadge,
  ViewToggle,
} from "@/components/shared";

/**
 * Component showcase for visual testing and documentation.
 * Not used in production - for development reference only.
 */
export function ComponentShowcase() {
  const [view, setView] = React.useState<"table" | "grid">("table");

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Logo Component</h2>
        <div className="flex flex-wrap gap-8 items-end">
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Small</p>
            <Logo size="sm" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Medium</p>
            <Logo size="md" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Large</p>
            <Logo size="lg" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Icon Only</p>
            <Logo size="md" showText={false} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Trend Indicator</h2>
        <div className="flex flex-wrap gap-6 items-center">
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Up (medium)</p>
            <TrendIndicator trend="up" size="md" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Down (medium)</p>
            <TrendIndicator trend="down" size="md" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Stable (medium)</p>
            <TrendIndicator trend="stable" size="md" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Up (small)</p>
            <TrendIndicator trend="up" size="sm" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Opportunity Score Badge</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">High (85)</p>
            <OpportunityScoreBadge score={85} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">High (70)</p>
            <OpportunityScoreBadge score={70} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Medium (55)</p>
            <OpportunityScoreBadge score={55} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Medium (40)</p>
            <OpportunityScoreBadge score={40} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Low (25)</p>
            <OpportunityScoreBadge score={25} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Low (5)</p>
            <OpportunityScoreBadge score={5} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Update Frequency Badge</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Active (15 days)</p>
            <UpdateFrequencyBadge daysSinceUpdate={15} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Active (29 days)</p>
            <UpdateFrequencyBadge daysSinceUpdate={29} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Moderate (45 days)</p>
            <UpdateFrequencyBadge daysSinceUpdate={45} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Moderate (90 days)</p>
            <UpdateFrequencyBadge daysSinceUpdate={90} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Stale (120 days)</p>
            <UpdateFrequencyBadge daysSinceUpdate={120} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Unknown</p>
            <UpdateFrequencyBadge daysSinceUpdate={null} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">View Toggle</h2>
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Current view: <strong>{view}</strong>
          </p>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Combined Example</h2>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <ViewToggle view={view} onChange={setView} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Opportunity</p>
              <OpportunityScoreBadge score={72} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Trend</p>
              <TrendIndicator trend="up" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Update Status</p>
              <UpdateFrequencyBadge daysSinceUpdate={12} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Competitor Trend</p>
              <TrendIndicator trend="down" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
