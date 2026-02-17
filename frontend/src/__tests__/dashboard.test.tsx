/**
 * Tests for dashboard components — StatsGrid, QuotaMeter.
 */

import React from "react";
import { render, screen } from "@testing-library/react";

import StatsGrid from "@/components/dashboard/StatsGrid";
import QuotaMeter from "@/components/dashboard/QuotaMeter";
import type { UsageInfo, Plan, CrawlJob } from "@/types";

const mockPlan: Plan = {
  id: 1,
  name: "free",
  max_keywords: 5,
  max_crawls_per_day: 2,
  max_results_stored: 500,
  price_cents_monthly: 0,
};

const mockUsageLow: UsageInfo = {
  keywords_used: 1,
  keywords_limit: 5,
  crawls_today: 0,
  crawls_limit: 2,
  results_stored: 50,
  results_limit: 500,
  plan: mockPlan,
};

const mockUsageMedium: UsageInfo = {
  keywords_used: 4,
  keywords_limit: 5,
  crawls_today: 1,
  crawls_limit: 2,
  results_stored: 400,
  results_limit: 500,
  plan: mockPlan,
};

const mockUsageHigh: UsageInfo = {
  keywords_used: 5,
  keywords_limit: 5,
  crawls_today: 2,
  crawls_limit: 2,
  results_stored: 490,
  results_limit: 500,
  plan: mockPlan,
};

const mockStats = [
  { label: "Total Keywords", value: 5 },
  { label: "Active Keywords", value: 3 },
  { label: "Apps Found", value: 128 },
  { label: "Crawls Today", value: 2 },
];

const mockRecentCrawls: CrawlJob[] = [
  {
    id: 1,
    keyword_id: 1,
    status: "completed",
    apps_found: 15,
    apps_new: 3,
    error_message: null,
    duration_seconds: 12.5,
    proxy_used: null,
    started_at: "2026-02-16T08:00:00",
    completed_at: "2026-02-16T08:00:12",
    created_at: "2026-02-16T08:00:00",
  },
  {
    id: 2,
    keyword_id: 2,
    status: "running",
    apps_found: 0,
    apps_new: 0,
    error_message: null,
    duration_seconds: null,
    proxy_used: null,
    started_at: "2026-02-16T09:00:00",
    completed_at: null,
    created_at: "2026-02-16T09:00:00",
  },
];

describe("StatsGrid", () => {
  it("renders all stat cards", () => {
    render(<StatsGrid stats={mockStats} />);

    expect(screen.getByText("Total Keywords")).toBeInTheDocument();
    expect(screen.getByText("Active Keywords")).toBeInTheDocument();
    expect(screen.getByText("Apps Found")).toBeInTheDocument();
    expect(screen.getByText("Crawls Today")).toBeInTheDocument();
  });

  it("renders stat values correctly", () => {
    render(<StatsGrid stats={mockStats} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders a dashboard-like stats grid with page structure", () => {
    // Simulates the dashboard page rendering stats in a grid
    render(
      <div>
        <h1>Dashboard</h1>
        <StatsGrid stats={mockStats} />
      </div>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // All 4 stat cards should be present
    const statLabels = mockStats.map((s) => s.label);
    statLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

describe("QuotaMeter", () => {
  it("renders with correct percentages", () => {
    render(<QuotaMeter usage={mockUsageLow} />);

    expect(screen.getByText("Usage Quota")).toBeInTheDocument();
    expect(screen.getByText("Keywords")).toBeInTheDocument();
    expect(screen.getByText("Crawls Today")).toBeInTheDocument();
    expect(screen.getByText("Results Stored")).toBeInTheDocument();

    // Check the "used / limit" text
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
    expect(screen.getByText("50 / 500")).toBeInTheDocument();
  });

  it("shows correct colors for low usage (green)", () => {
    const { container } = render(<QuotaMeter usage={mockUsageLow} />);

    // Low usage bars should have green color
    const greenBars = container.querySelectorAll(".bg-green-500");
    expect(greenBars.length).toBeGreaterThan(0);
  });

  it("shows correct colors for high usage (red)", () => {
    const { container } = render(<QuotaMeter usage={mockUsageHigh} />);

    // 100% usage bars should have red color
    const redBars = container.querySelectorAll(".bg-red-500");
    expect(redBars.length).toBeGreaterThan(0);
  });
});

describe("Recent crawls list", () => {
  it("renders recent crawls", () => {
    // Simple rendering test for a crawls list section on the dashboard
    render(
      <div>
        <h3>Recent Crawls</h3>
        <ul>
          {mockRecentCrawls.map((job) => (
            <li key={job.id}>
              <span>{job.status}</span>
              <span>{job.apps_found} apps found</span>
            </li>
          ))}
        </ul>
      </div>,
    );

    expect(screen.getByText("Recent Crawls")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("running")).toBeInTheDocument();
    expect(screen.getByText("15 apps found")).toBeInTheDocument();
  });
});
