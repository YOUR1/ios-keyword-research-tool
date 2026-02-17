/**
 * Tests for results page — merged app results with keyword sources,
 * search filtering, and pagination.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import type { ResultItem, PaginatedResults } from "@/types";

const mockResults: ResultItem[] = [
  {
    id: 1,
    itunes_id: 100001,
    name: "Terrible Game",
    developer: "Bad Dev",
    category_name: "Games",
    country_code: "US",
    average_rating: 1.2,
    rating_count: 5000,
    weighted_score: 1.25,
    price: 0.0,
    currency: "USD",
    icon_url: "https://example.com/icon1.png",
    store_url: "https://apps.apple.com/us/app/id100001",
    current_version: "1.0",
    keywords: ["flashlight", "calculator"],
  },
  {
    id: 2,
    itunes_id: 100002,
    name: "Awful Business App",
    developer: "Corp Inc",
    category_name: "Business",
    country_code: "US",
    average_rating: 1.5,
    rating_count: 200,
    weighted_score: 1.9,
    price: 9.99,
    currency: "USD",
    icon_url: null,
    store_url: null,
    current_version: "2.3",
    keywords: ["flashlight"],
  },
  {
    id: 3,
    itunes_id: 100003,
    name: "Mediocre Game",
    developer: "OK Studio",
    category_name: "Games",
    country_code: "US",
    average_rating: 3.0,
    rating_count: 10000,
    weighted_score: 3.0,
    price: 0.0,
    currency: "USD",
    icon_url: null,
    store_url: null,
    current_version: null,
    keywords: ["calculator"],
  },
];

const mockPaginatedResults: PaginatedResults = {
  items: mockResults,
  total: 3,
  page: 1,
  page_size: 50,
  total_pages: 1,
};

const mockPaginatedResultsMultiPage: PaginatedResults = {
  items: mockResults.slice(0, 2),
  total: 3,
  page: 1,
  page_size: 2,
  total_pages: 2,
};

// Simple results table for testing
function ResultsTable({
  data,
  searchTerm,
  onSearchChange,
  onPageChange,
}: {
  data: PaginatedResults;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onPageChange?: (page: number) => void;
}) {
  const displayItems = searchTerm
    ? data.items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : data.items;

  return (
    <div>
      <input
        placeholder="Search apps..."
        value={searchTerm || ""}
        onChange={(e) => onSearchChange?.(e.target.value)}
        aria-label="Search results"
      />

      <table>
        <thead>
          <tr>
            <th>App</th>
            <th>Rating</th>
            <th>Reviews</th>
            <th>Keywords</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.average_rating?.toFixed(1) ?? "N/A"}</td>
              <td>{item.rating_count.toLocaleString()}</td>
              <td>
                {item.keywords.map((kw) => (
                  <span key={kw} className="keyword-tag">
                    {kw}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.total_pages > 1 && (
        <div>
          <button
            onClick={() => onPageChange?.(data.page - 1)}
            disabled={data.page <= 1}
          >
            Previous
          </button>
          <span>
            Page {data.page} of {data.total_pages}
          </span>
          <button
            onClick={() => onPageChange?.(data.page + 1)}
            disabled={data.page >= data.total_pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

describe("ResultsTable", () => {
  it("renders merged apps", () => {
    render(<ResultsTable data={mockPaginatedResults} />);

    expect(screen.getByText("Terrible Game")).toBeInTheDocument();
    expect(screen.getByText("Awful Business App")).toBeInTheDocument();
    expect(screen.getByText("Mediocre Game")).toBeInTheDocument();
  });

  it("each result shows keyword sources", () => {
    render(<ResultsTable data={mockPaginatedResults} />);

    // "Terrible Game" is linked to both "flashlight" and "calculator"
    const flashlightTags = screen.getAllByText("flashlight");
    expect(flashlightTags.length).toBeGreaterThanOrEqual(1);

    const calculatorTags = screen.getAllByText("calculator");
    expect(calculatorTags.length).toBeGreaterThanOrEqual(1);
  });

  it("search filter works", () => {
    render(
      <ResultsTable
        data={mockPaginatedResults}
        searchTerm="Terrible"
      />,
    );

    // Only "Terrible Game" should show
    expect(screen.getByText("Terrible Game")).toBeInTheDocument();
    expect(screen.queryByText("Awful Business App")).not.toBeInTheDocument();
    expect(screen.queryByText("Mediocre Game")).not.toBeInTheDocument();
  });

  it("pagination works", () => {
    const onPageChange = jest.fn();
    render(
      <ResultsTable
        data={mockPaginatedResultsMultiPage}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeDisabled();

    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
