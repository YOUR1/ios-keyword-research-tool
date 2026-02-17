/**
 * Tests for TypeScript type definitions — validates that types
 * match expected API contract shapes.
 *
 * These tests use runtime type checking to verify the contract
 * between frontend and backend stays consistent.
 */

import type {
  AppListItem,
  AppDetail,
  PaginatedApps,
  Category,
  Country,
  RatingHistoryItem,
  IndexStats,
  SortField,
  AppFilters,
} from "@/types";
import {
  mockAppItem,
  mockAppItemNoRating,
  mockAppDetail,
  mockPaginatedApps,
  mockCategory,
  mockCountry,
  mockRatingHistory,
} from "./fixtures";

describe("Type contracts", () => {
  describe("AppListItem", () => {
    it("has all required fields", () => {
      const item: AppListItem = mockAppItem;
      expect(item.id).toBeDefined();
      expect(item.itunes_id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.country_code).toBeDefined();
      expect(typeof item.rating_count).toBe("number");
      expect(typeof item.price).toBe("number");
      expect(typeof item.currency).toBe("string");
    });

    it("allows null optional fields", () => {
      const item: AppListItem = mockAppItemNoRating;
      expect(item.developer).toBeNull();
      expect(item.category_name).toBeNull();
      expect(item.average_rating).toBeNull();
      expect(item.weighted_score).toBeNull();
      expect(item.icon_url).toBeNull();
      expect(item.store_url).toBeNull();
      expect(item.current_version).toBeNull();
    });
  });

  describe("AppDetail", () => {
    it("has all required fields including nested objects", () => {
      const detail: AppDetail = mockAppDetail;
      expect(detail.country).toBeDefined();
      expect(detail.country.code).toBe("US");
      expect(detail.category).toBeDefined();
      expect(detail.category!.name).toBe("Games");
      expect(detail.created_at).toBeDefined();
      expect(detail.updated_at).toBeDefined();
    });

    it("has additional detail fields not in list item", () => {
      const detail: AppDetail = mockAppDetail;
      expect(detail.bundle_id).toBeDefined();
      expect(detail.description).toBeDefined();
      expect(detail.content_rating).toBeDefined();
      expect(detail.release_date).toBeDefined();
      expect(detail.updated_date).toBeDefined();
    });
  });

  describe("PaginatedApps", () => {
    it("has pagination metadata", () => {
      const page: PaginatedApps = mockPaginatedApps;
      expect(page.total).toBe(3);
      expect(page.page).toBe(1);
      expect(page.page_size).toBe(50);
      expect(page.total_pages).toBe(1);
      expect(Array.isArray(page.items)).toBe(true);
    });
  });

  describe("Category", () => {
    it("has all required fields", () => {
      const cat: Category = mockCategory;
      expect(cat.id).toBe(1);
      expect(cat.itunes_id).toBe(6014);
      expect(cat.name).toBe("Games");
      expect(cat.parent_id).toBeNull();
    });
  });

  describe("Country", () => {
    it("has all required fields", () => {
      const c: Country = mockCountry;
      expect(c.id).toBe(1);
      expect(c.code).toBe("US");
      expect(c.name).toBe("United States");
    });
  });

  describe("RatingHistoryItem", () => {
    it("has all fields", () => {
      const item: RatingHistoryItem = mockRatingHistory[0];
      expect(item.snapshot_date).toBeDefined();
      expect(typeof item.rating_count).toBe("number");
    });
  });

  describe("SortField", () => {
    it("accepts all valid sort values", () => {
      const validSorts: SortField[] = [
        "lowest_rating",
        "lowest_weighted",
        "highest_rating",
        "most_reviews",
        "fewest_reviews",
        "name",
      ];
      expect(validSorts).toHaveLength(6);
    });
  });

  describe("AppFilters", () => {
    it("has correct default shape", () => {
      const filters: AppFilters = {
        sort: "lowest_weighted",
        country: "",
        category: "",
        min_reviews: 0,
        max_rating: null,
        search: "",
        page: 1,
        page_size: 50,
      };
      expect(filters.sort).toBe("lowest_weighted");
      expect(filters.max_rating).toBeNull();
    });
  });
});
