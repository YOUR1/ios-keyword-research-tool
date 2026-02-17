/**
 * Tests for src/lib/api.ts — API client functions.
 */

import { getApps, getApp, getAppHistory, getCategories, getCountries, getStats } from "@/lib/api";
import {
  mockPaginatedApps,
  mockAppDetail,
  mockRatingHistory,
  mockCategories,
  mockCountries,
} from "./fixtures";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("getApps", () => {
  it("calls /apps with correct query params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedApps,
    });

    const result = await getApps({ sort: "lowest_weighted", country: "US", page: 1, page_size: 50 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/apps");
    expect(url).toContain("sort=lowest_weighted");
    expect(url).toContain("country=US");
    expect(url).toContain("page=1");
    expect(url).toContain("page_size=50");
    expect(result.items).toHaveLength(3);
  });

  it("omits empty/null/undefined params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedApps,
    });

    await getApps({ sort: "lowest_weighted", country: "", category: "" });

    const url = mockFetch.mock.calls[0][0];
    expect(url).not.toContain("country=");
    expect(url).not.toContain("category=");
  });

  it("includes min_reviews when non-zero", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedApps,
    });

    await getApps({ min_reviews: 500 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("min_reviews=500");
  });

  it("includes max_rating when set", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedApps,
    });

    await getApps({ max_rating: 2.5 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("max_rating=2.5");
  });

  it("excludes max_rating when null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginatedApps,
    });

    await getApps({ max_rating: null });

    const url = mockFetch.mock.calls[0][0];
    expect(url).not.toContain("max_rating");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(getApps({})).rejects.toThrow("API error: 500 Internal Server Error");
  });
});

describe("getApp", () => {
  it("calls /apps/{id}", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppDetail,
    });

    const result = await getApp(1);

    expect(mockFetch.mock.calls[0][0]).toContain("/apps/1");
    expect(result.name).toBe("Terrible Game");
  });

  it("throws on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(getApp(99999)).rejects.toThrow("API error: 404 Not Found");
  });
});

describe("getAppHistory", () => {
  it("calls /apps/{id}/history", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRatingHistory,
    });

    const result = await getAppHistory(1);

    expect(mockFetch.mock.calls[0][0]).toContain("/apps/1/history");
    expect(result).toHaveLength(5);
  });
});

describe("getCategories", () => {
  it("calls /categories", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    });

    const result = await getCategories();

    expect(mockFetch.mock.calls[0][0]).toContain("/categories");
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Games");
  });
});

describe("getCountries", () => {
  it("calls /categories/countries", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCountries,
    });

    const result = await getCountries();

    expect(mockFetch.mock.calls[0][0]).toContain("/categories/countries");
    expect(result).toHaveLength(3);
  });
});

describe("getStats", () => {
  it("calls /apps/stats", async () => {
    const mockStats = {
      total_apps: 1000,
      total_countries: 5,
      total_categories: 27,
      last_crawl: "2026-02-15T10:00:00",
      global_mean_rating: 3.2,
      min_rating_threshold: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const result = await getStats();

    expect(mockFetch.mock.calls[0][0]).toContain("/apps/stats");
    expect(result.total_apps).toBe(1000);
  });
});
