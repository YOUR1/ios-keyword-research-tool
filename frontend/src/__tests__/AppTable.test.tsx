/**
 * Tests for the AppTable component.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AppTable from "@/components/AppTable";
import {
  mockPaginatedApps,
  mockPaginatedAppsMultiPage,
  mockPaginatedAppsEmpty,
} from "./fixtures";

// Mock next/link to render a simple <a>
jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

describe("AppTable", () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    mockOnPageChange.mockReset();
  });

  it("renders a table with app data", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("Terrible Game")).toBeInTheDocument();
    expect(screen.getByText("Awful Business App")).toBeInTheDocument();
    expect(screen.getByText("Unrated App")).toBeInTheDocument();
  });

  it("displays developer names", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("Bad Dev")).toBeInTheDocument();
    expect(screen.getByText("Corp Inc")).toBeInTheDocument();
  });

  it("shows 'Unknown Developer' for null developers", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("Unknown Developer")).toBeInTheDocument();
  });

  it("displays rating count", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("displays numeric ratings", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("1.20")).toBeInTheDocument();
    expect(screen.getByText("1.50")).toBeInTheDocument();
  });

  it("displays N/A for null ratings", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows Free for zero-price apps", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
  });

  it("shows price for paid apps", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("USD 9.99")).toBeInTheDocument();
  });

  it("displays weighted scores", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("1.250")).toBeInTheDocument();
    expect(screen.getByText("1.900")).toBeInTheDocument();
  });

  it("renders rank badges starting from 1", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("links app names to detail pages", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    const links = screen.getAllByRole("link");
    const appLink = links.find((l) => l.getAttribute("href") === "/apps/1");
    expect(appLink).toBeDefined();
  });

  it("renders app icons when available", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    const icons = screen.getAllByRole("img");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("shows empty state message when no apps", () => {
    render(<AppTable data={mockPaginatedAppsEmpty} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("No apps found matching your filters.")).toBeInTheDocument();
  });

  it("does not show pagination for single page", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("shows pagination for multi-page results", () => {
    render(<AppTable data={mockPaginatedAppsMultiPage} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("disables Previous button on first page", () => {
    render(<AppTable data={mockPaginatedAppsMultiPage} onPageChange={mockOnPageChange} />);

    const prevButton = screen.getByText("Previous");
    expect(prevButton).toBeDisabled();
  });

  it("calls onPageChange when Next is clicked", () => {
    render(<AppTable data={mockPaginatedAppsMultiPage} onPageChange={mockOnPageChange} />);

    fireEvent.click(screen.getByText("Next"));
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it("shows correct item range text", () => {
    render(<AppTable data={mockPaginatedAppsMultiPage} onPageChange={mockOnPageChange} />);

    expect(screen.getByText(/Showing 1–2 of 5 apps/)).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<AppTable data={mockPaginatedApps} onPageChange={mockOnPageChange} />);

    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("App")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });
});
