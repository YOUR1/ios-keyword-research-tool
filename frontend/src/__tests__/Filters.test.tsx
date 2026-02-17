/**
 * Tests for the Filters component (shadcn/ui based).
 *
 * Note: Radix Select components render as buttons with trigger text
 * rather than native <select> elements. Dropdown interactions require
 * clicking the trigger and selecting items from a portal.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Filters from "@/components/Filters";
import { mockCategories, mockCountries } from "./fixtures";
import type { AppFilters } from "@/types";

const defaultFilters: AppFilters = {
  sort: "lowest_weighted",
  country: "",
  category: "",
  min_reviews: 0,
  max_rating: null,
  search: "",
  page: 1,
  page_size: 50,
};

describe("Filters", () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockReset();
  });

  it("renders all filter labels", () => {
    render(
      <Filters
        filters={defaultFilters}
        categories={mockCategories}
        countries={mockCountries}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Sort By")).toBeInTheDocument();
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText(/Minimum Reviews/)).toBeInTheDocument();
  });

  it("renders search input with placeholder", () => {
    render(
      <Filters
        filters={defaultFilters}
        categories={mockCategories}
        countries={mockCountries}
        onFilterChange={mockOnFilterChange}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search app name...");
    expect(searchInput).toBeInTheDocument();
  });

  it("debounces search input and calls onFilterChange", async () => {
    jest.useFakeTimers();
    render(
      <Filters
        filters={defaultFilters}
        categories={mockCategories}
        countries={mockCountries}
        onFilterChange={mockOnFilterChange}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search app name...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Should not fire immediately
    expect(mockOnFilterChange).not.toHaveBeenCalled();

    // Advance past debounce
    jest.advanceTimersByTime(350);

    expect(mockOnFilterChange).toHaveBeenCalledWith({ search: "test" });
    jest.useRealTimers();
  });

  it("displays current min_reviews value", () => {
    const filtersWithMinReviews = { ...defaultFilters, min_reviews: 2500 };
    render(
      <Filters
        filters={filtersWithMinReviews}
        categories={mockCategories}
        countries={mockCountries}
        onFilterChange={mockOnFilterChange}
      />
    );

    const matches = screen.getAllByText("2,500");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders with empty categories and countries", () => {
    render(
      <Filters
        filters={defaultFilters}
        categories={[]}
        countries={[]}
        onFilterChange={mockOnFilterChange}
      />
    );

    // Should have select triggers for all dropdowns
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Sort By")).toBeInTheDocument();
  });

  it("reflects current search value", () => {
    const activeFilters: AppFilters = {
      ...defaultFilters,
      search: "game",
    };

    render(
      <Filters
        filters={activeFilters}
        categories={mockCategories}
        countries={mockCountries}
        onFilterChange={mockOnFilterChange}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search app name...") as HTMLInputElement;
    expect(searchInput.value).toBe("game");
  });

  it("renders the slider element", () => {
    render(
      <Filters
        filters={defaultFilters}
        categories={mockCategories}
        countries={mockCountries}
        onFilterChange={mockOnFilterChange}
      />
    );

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
  });
});
