/**
 * Shared test fixtures for frontend tests.
 */

import type {
  AppListItem,
  AppDetail,
  PaginatedApps,
  Category,
  Country,
  RatingHistoryItem,
  Review,
  ReviewSummary,
  PaginatedReviews,
  SearchSuggestionsResponse,
  TrendingApp,
  TrendingResponse,
} from "@/types";

export const mockCountry: Country = {
  id: 1,
  code: "US",
  name: "United States",
};

export const mockCategory: Category = {
  id: 1,
  itunes_id: 6014,
  name: "Games",
  parent_id: null,
};

export const mockAppItem: AppListItem = {
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
  icon_url: "https://example.com/icon.png",
  store_url: "https://apps.apple.com/us/app/id100001",
  current_version: "1.0",
};

export const mockAppItemNoRating: AppListItem = {
  id: 5,
  itunes_id: 100005,
  name: "Unrated App",
  developer: null,
  category_name: null,
  country_code: "US",
  average_rating: null,
  rating_count: 0,
  weighted_score: null,
  price: 0.0,
  currency: "USD",
  icon_url: null,
  store_url: null,
  current_version: null,
};

export const mockAppItemPaid: AppListItem = {
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
  store_url: "https://apps.apple.com/us/app/id100002",
  current_version: "2.3",
};

export const mockPaginatedApps: PaginatedApps = {
  items: [mockAppItem, mockAppItemPaid, mockAppItemNoRating],
  total: 3,
  page: 1,
  page_size: 50,
  total_pages: 1,
};

export const mockPaginatedAppsMultiPage: PaginatedApps = {
  items: [mockAppItem, mockAppItemPaid],
  total: 5,
  page: 1,
  page_size: 2,
  total_pages: 3,
};

export const mockPaginatedAppsEmpty: PaginatedApps = {
  items: [],
  total: 0,
  page: 1,
  page_size: 50,
  total_pages: 0,
};

export const mockAppDetail: AppDetail = {
  id: 1,
  itunes_id: 100001,
  bundle_id: "com.baddev.terriblegame",
  name: "Terrible Game",
  developer: "Bad Dev",
  category: mockCategory,
  country: mockCountry,
  average_rating: 1.2,
  rating_count: 5000,
  weighted_score: 1.25,
  current_version: "1.0",
  price: 0.0,
  currency: "USD",
  icon_url: "https://example.com/icon.png",
  store_url: "https://apps.apple.com/us/app/id100001",
  description: "A terrible game that nobody likes.",
  content_rating: "4+",
  release_date: "2023-06-15",
  updated_date: "2025-01-10T12:30:00",
  created_at: "2026-01-01T00:00:00",
  updated_at: "2026-02-01T00:00:00",
};

export const mockRatingHistory: RatingHistoryItem[] = [
  { snapshot_date: "2026-02-10", average_rating: 1.2, rating_count: 5000, weighted_score: 1.25 },
  { snapshot_date: "2026-02-11", average_rating: 1.25, rating_count: 5100, weighted_score: 1.29 },
  { snapshot_date: "2026-02-12", average_rating: 1.3, rating_count: 5200, weighted_score: 1.33 },
  { snapshot_date: "2026-02-13", average_rating: 1.35, rating_count: 5300, weighted_score: 1.37 },
  { snapshot_date: "2026-02-14", average_rating: 1.4, rating_count: 5400, weighted_score: 1.41 },
];

export const mockCategories: Category[] = [
  { id: 1, itunes_id: 6014, name: "Games", parent_id: null },
  { id: 2, itunes_id: 6000, name: "Business", parent_id: null },
  { id: 3, itunes_id: 6015, name: "Finance", parent_id: null },
];

export const mockCountries: Country[] = [
  { id: 1, code: "US", name: "United States" },
  { id: 2, code: "NL", name: "Netherlands" },
  { id: 3, code: "GB", name: "United Kingdom" },
];

export const mockReviews: Review[] = [
  {
    id: 1,
    app_id: 1,
    author_name: "angry_user",
    rating: 1,
    title: "Worst app ever",
    body: "This app crashed every time I opened it.",
    review_date: "2026-02-10T10:00:00",
    language: "en",
  },
  {
    id: 2,
    app_id: 1,
    author_name: "disappointed",
    rating: 2,
    title: "Very buggy",
    body: "Too many bugs to count.",
    review_date: "2026-02-09T08:00:00",
    language: "en",
  },
  {
    id: 3,
    app_id: 1,
    author_name: "meh_user",
    rating: 3,
    title: null,
    body: null,
    review_date: null,
    language: null,
  },
];

export const mockReviewSummary: ReviewSummary = {
  total_reviews: 50,
  rating_distribution: { "1": 25, "2": 12, "3": 8, "4": 3, "5": 2 },
  average_review_rating: 1.9,
};

export const mockPaginatedReviews: PaginatedReviews = {
  items: mockReviews,
  summary: mockReviewSummary,
  total: 50,
  page: 1,
  page_size: 20,
  total_pages: 3,
};

// Discover fixtures
export const mockTrendingApp: TrendingApp = {
  itunes_id: "123456",
  name: "Trending Game",
  developer: "Cool Dev",
  icon_url: "https://example.com/trending-icon.png",
  genres: ["Games", "Entertainment"],
  store_url: "https://apps.apple.com/app/123456",
};

export const mockSuggestionsResponse: SearchSuggestionsResponse = {
  term: "calc",
  country: "US",
  suggestions: [
    { term: "calculator" },
    { term: "calendar" },
    { term: "calorie tracker" },
  ],
};

export const mockTrendingResponse: TrendingResponse = {
  country: "US",
  chart: "top-free",
  apps: [
    mockTrendingApp,
    {
      itunes_id: "789012",
      name: "Social Network",
      developer: "Big Corp",
      icon_url: "https://example.com/social-icon.png",
      genres: ["Social Networking"],
      store_url: "https://apps.apple.com/app/789012",
    },
    {
      itunes_id: "345678",
      name: "Photo Editor",
      developer: null,
      icon_url: null,
      genres: ["Photo & Video"],
      store_url: null,
    },
  ],
  count: 3,
};
