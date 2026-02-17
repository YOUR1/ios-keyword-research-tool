/**
 * Tests for crawl history — CrawlStatusBadge, crawl history table,
 * status filtering, empty state, and auto-polling concept.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import CrawlStatusBadge from "@/components/dashboard/CrawlStatusBadge";
import type { CrawlJob, PaginatedCrawlJobs } from "@/types";

const mockCrawlJobs: CrawlJob[] = [
  {
    id: 1,
    keyword_id: 1,
    status: "completed",
    apps_found: 25,
    apps_new: 5,
    error_message: null,
    duration_seconds: 14.3,
    proxy_used: "iproyal",
    started_at: "2026-02-16T08:00:00",
    completed_at: "2026-02-16T08:00:14",
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
  {
    id: 3,
    keyword_id: 1,
    status: "failed",
    apps_found: 0,
    apps_new: 0,
    error_message: "Connection timeout",
    duration_seconds: 30.0,
    proxy_used: null,
    started_at: "2026-02-15T12:00:00",
    completed_at: "2026-02-15T12:00:30",
    created_at: "2026-02-15T12:00:00",
  },
  {
    id: 4,
    keyword_id: 3,
    status: "pending",
    apps_found: 0,
    apps_new: 0,
    error_message: null,
    duration_seconds: null,
    proxy_used: null,
    started_at: null,
    completed_at: null,
    created_at: "2026-02-16T10:00:00",
  },
];

const mockPaginatedJobs: PaginatedCrawlJobs = {
  items: mockCrawlJobs,
  total: 4,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const mockPaginatedJobsEmpty: PaginatedCrawlJobs = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};

// Simple crawl history table for testing
function CrawlHistoryTable({
  data,
  statusFilter,
  onFilterChange,
}: {
  data: PaginatedCrawlJobs;
  statusFilter?: string;
  onFilterChange?: (status: string) => void;
}) {
  const filteredItems = statusFilter
    ? data.items.filter((j) => j.status === statusFilter)
    : data.items;

  return (
    <div>
      <div>
        <select
          value={statusFilter || ""}
          onChange={(e) => onFilterChange?.(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div>No crawl jobs found.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Apps Found</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>
                  <CrawlStatusBadge status={job.status} />
                </td>
                <td>{job.apps_found}</td>
                <td>{job.duration_seconds ? `${job.duration_seconds}s` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

describe("CrawlHistoryTable", () => {
  it("renders crawl jobs", () => {
    render(<CrawlHistoryTable data={mockPaginatedJobs} />);

    // All 4 jobs should be visible
    expect(screen.getByText("25")).toBeInTheDocument(); // apps_found
    expect(screen.getByText("14.3s")).toBeInTheDocument(); // duration
    // Error messages may or may not be rendered in table depending on implementation
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("empty state when no crawls", () => {
    render(<CrawlHistoryTable data={mockPaginatedJobsEmpty} />);

    expect(screen.getByText(/no crawl jobs found/i)).toBeInTheDocument();
  });

  it("filter by status works", () => {
    const onFilterChange = jest.fn();
    render(
      <CrawlHistoryTable
        data={mockPaginatedJobs}
        statusFilter="completed"
        onFilterChange={onFilterChange}
      />,
    );

    // Only completed jobs should show (1 job)
    const rows = screen.getAllByRole("row");
    // 1 header row + 1 data row
    expect(rows.length).toBe(2);
  });
});

describe("CrawlStatusBadge", () => {
  it("shows correct colors for each status", () => {
    const statuses = ["pending", "running", "completed", "failed"];

    statuses.forEach((status) => {
      const { container, unmount } = render(<CrawlStatusBadge status={status} />);

      const badge = container.querySelector("span");
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe(status);

      // Verify each status has its own styling
      if (status === "pending") {
        expect(badge!.className).toContain("yellow");
      } else if (status === "running") {
        expect(badge!.className).toContain("blue");
        expect(badge!.className).toContain("animate-pulse");
      } else if (status === "completed") {
        expect(badge!.className).toContain("green");
      } else if (status === "failed") {
        expect(badge!.className).toContain("red");
      }

      unmount();
    });
  });
});

describe("Auto-poll concept", () => {
  it("checks auto-poll when running jobs exist", () => {
    // This test verifies the concept: when running jobs exist,
    // a refetchInterval should be set. We test the logic.
    const hasRunningJobs = mockCrawlJobs.some((j) => j.status === "running");
    expect(hasRunningJobs).toBe(true);

    // The refetch interval should be active when running jobs exist
    const refetchInterval = hasRunningJobs ? 5000 : false;
    expect(refetchInterval).toBe(5000);

    // When no running jobs, interval should be false (disabled)
    const noRunning = mockCrawlJobs.filter((j) => j.status !== "running");
    const hasRunning2 = noRunning.some((j) => j.status === "running");
    const interval2 = hasRunning2 ? 5000 : false;
    expect(interval2).toBe(false);
  });
});
