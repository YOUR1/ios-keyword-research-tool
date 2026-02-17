/**
 * Tests for the ReviewList component.
 *
 * Uses React Query's QueryClientProvider for data fetching
 * and mocks the getAppReviews API call.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReviewList from "@/components/ReviewList";
import { mockPaginatedReviews, mockReviewSummary } from "./fixtures";
import type { PaginatedReviews } from "@/types";

// Mock the API module
jest.mock("@/lib/api", () => ({
  getAppReviews: jest.fn(),
}));

import { getAppReviews } from "@/lib/api";
const mockGetAppReviews = getAppReviews as jest.MockedFunction<typeof getAppReviews>;

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ReviewList", () => {
  beforeEach(() => {
    mockGetAppReviews.mockReset();
  });

  it("renders the heading", () => {
    mockGetAppReviews.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQueryClient(<ReviewList appId={1} />);

    expect(screen.getByText("Customer Reviews")).toBeInTheDocument();
  });

  it("shows skeleton loaders while loading", () => {
    mockGetAppReviews.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithQueryClient(<ReviewList appId={1} />);

    // Skeleton elements are rendered during loading
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders reviews when data loads", async () => {
    mockGetAppReviews.mockResolvedValue(mockPaginatedReviews);
    renderWithQueryClient(<ReviewList appId={1} />);

    await waitFor(() => {
      expect(screen.getByText("angry_user")).toBeInTheDocument();
    });

    expect(screen.getByText("Worst app ever")).toBeInTheDocument();
    expect(screen.getByText("This app crashed every time I opened it.")).toBeInTheDocument();
    expect(screen.getByText("disappointed")).toBeInTheDocument();
    expect(screen.getByText("Very buggy")).toBeInTheDocument();
  });

  it("shows empty state when no reviews", async () => {
    const emptyReviews: PaginatedReviews = {
      items: [],
      summary: { total_reviews: 0, rating_distribution: {}, average_review_rating: null },
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    };
    mockGetAppReviews.mockResolvedValue(emptyReviews);
    renderWithQueryClient(<ReviewList appId={1} />);

    await waitFor(() => {
      expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    });
  });

  it("renders rating distribution when summary is present", async () => {
    mockGetAppReviews.mockResolvedValue(mockPaginatedReviews);
    renderWithQueryClient(<ReviewList appId={1} />);

    await waitFor(() => {
      expect(screen.getByText("50 reviews total")).toBeInTheDocument();
    });
  });

  it("shows pagination when multiple pages exist", async () => {
    mockGetAppReviews.mockResolvedValue(mockPaginatedReviews);
    renderWithQueryClient(<ReviewList appId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("hides pagination for single page", async () => {
    const singlePage: PaginatedReviews = {
      ...mockPaginatedReviews,
      total: 3,
      total_pages: 1,
    };
    mockGetAppReviews.mockResolvedValue(singlePage);
    renderWithQueryClient(<ReviewList appId={1} />);

    await waitFor(() => {
      expect(screen.getByText("angry_user")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("renders star icons for each review", async () => {
    mockGetAppReviews.mockResolvedValue(mockPaginatedReviews);
    const { container } = renderWithQueryClient(<ReviewList appId={1} />);

    await waitFor(() => {
      expect(screen.getByText("angry_user")).toBeInTheDocument();
    });

    // 3 reviews × 5 stars each + stars in RatingDistribution (5)
    const starSvgs = container.querySelectorAll("svg");
    expect(starSvgs.length).toBeGreaterThanOrEqual(15);
  });
});
