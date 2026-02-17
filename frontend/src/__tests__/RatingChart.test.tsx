/**
 * Tests for the RatingChart component.
 *
 * Recharts uses SVG internally which is difficult to assert on in jsdom,
 * so we focus on testing that the component renders without errors,
 * the heading is displayed, and it handles edge cases gracefully.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import RatingChart from "@/components/RatingChart";
import { mockRatingHistory } from "./fixtures";

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock("recharts", () => {
  const Original = jest.requireActual("recharts");
  return {
    ...Original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

describe("RatingChart", () => {
  it("renders the heading", () => {
    render(<RatingChart data={mockRatingHistory} />);
    expect(screen.getByText("Rating History")).toBeInTheDocument();
  });

  it("renders the responsive container", () => {
    render(<RatingChart data={mockRatingHistory} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders without crashing with empty data", () => {
    render(<RatingChart data={[]} />);
    expect(screen.getByText("Rating History")).toBeInTheDocument();
  });

  it("renders with single data point", () => {
    const singlePoint = [mockRatingHistory[0]];
    render(<RatingChart data={singlePoint} />);
    expect(screen.getByText("Rating History")).toBeInTheDocument();
  });

  it("renders with null ratings in data", () => {
    const dataWithNulls = [
      { snapshot_date: "2026-02-10", average_rating: null, rating_count: 0, weighted_score: null },
      ...mockRatingHistory,
    ];
    render(<RatingChart data={dataWithNulls} />);
    expect(screen.getByText("Rating History")).toBeInTheDocument();
  });
});
