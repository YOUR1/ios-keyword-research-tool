/**
 * Tests for the RatingDistribution component.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import RatingDistribution from "@/components/RatingDistribution";

const mockDistribution = { "1": 25, "2": 12, "3": 8, "4": 3, "5": 2 };

describe("RatingDistribution", () => {
  it("renders a row for each star level (5 down to 1)", () => {
    render(
      <RatingDistribution distribution={mockDistribution} totalReviews={50} />
    );

    // Each star label appears alongside its count; use getAllByText for values
    // that collide (e.g. "2" appears as both a star label and a count).
    for (const stars of [1, 2, 3, 4, 5]) {
      const matches = screen.getAllByText(String(stars));
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("displays counts for each rating", () => {
    render(
      <RatingDistribution distribution={mockDistribution} totalReviews={50} />
    );

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    // "3" and "2" appear both as star labels and as counts, so use getAllByText
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("shows total reviews text", () => {
    render(
      <RatingDistribution distribution={mockDistribution} totalReviews={50} />
    );

    expect(screen.getByText("50 reviews total")).toBeInTheDocument();
  });

  it("uses singular 'review' for totalReviews === 1", () => {
    render(
      <RatingDistribution distribution={{ "1": 1 }} totalReviews={1} />
    );

    expect(screen.getByText("1 review total")).toBeInTheDocument();
  });

  it("renders zero counts for missing ratings", () => {
    render(
      <RatingDistribution distribution={{ "1": 10 }} totalReviews={10} />
    );

    // Stars 2-5 should show 0
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(4);
  });

  it("formats large total with locale string", () => {
    render(
      <RatingDistribution distribution={mockDistribution} totalReviews={12500} />
    );

    expect(screen.getByText(/12,500 reviews total/)).toBeInTheDocument();
  });

  it("renders star icons for each row", () => {
    const { container } = render(
      <RatingDistribution distribution={mockDistribution} totalReviews={50} />
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(5);
  });
});
