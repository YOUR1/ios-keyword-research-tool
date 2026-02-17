"""
Tests for /api/v1/apps endpoints — the core API.

Tests list, detail, history, stats endpoints with various filters and edge cases.
"""

import pytest


class TestListApps:
    async def test_returns_paginated_response(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

    async def test_default_sort_is_lowest_weighted(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps")
        data = resp.json()
        items = data["items"]
        # Default sort = lowest_weighted, which excludes apps with no rating
        # Should be sorted by weighted_score ascending
        scores = [i["weighted_score"] for i in items if i["weighted_score"] is not None]
        assert scores == sorted(scores)

    async def test_sort_lowest_rating(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=lowest_rating")
        data = resp.json()
        items = data["items"]
        ratings = [i["average_rating"] for i in items if i["average_rating"] is not None]
        assert ratings == sorted(ratings)

    async def test_sort_highest_rating(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=highest_rating")
        data = resp.json()
        items = data["items"]
        ratings = [i["average_rating"] for i in items if i["average_rating"] is not None]
        assert ratings == sorted(ratings, reverse=True)

    async def test_sort_most_reviews(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=most_reviews")
        data = resp.json()
        items = data["items"]
        counts = [i["rating_count"] for i in items]
        assert counts == sorted(counts, reverse=True)

    async def test_sort_by_name(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name")
        data = resp.json()
        items = data["items"]
        names = [i["name"] for i in items]
        assert names == sorted(names)

    async def test_filter_by_country(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&country=NL")
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Dutch App"
        assert data["items"][0]["country_code"] == "NL"

    async def test_filter_by_country_case_insensitive(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&country=nl")
        data = resp.json()
        assert data["total"] == 1

    async def test_filter_by_category(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&category=Business")
        data = resp.json()
        # "Awful Business App" and "Dutch App" are in Business
        assert data["total"] == 2

    async def test_filter_by_min_reviews(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&min_reviews=1000")
        data = resp.json()
        for item in data["items"]:
            assert item["rating_count"] >= 1000

    async def test_filter_by_max_rating(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&max_rating=1.5")
        data = resp.json()
        for item in data["items"]:
            assert item["average_rating"] is not None
            assert item["average_rating"] <= 1.5

    async def test_search_by_name(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&search=Terrible")
        data = resp.json()
        assert data["total"] == 1
        assert "Terrible" in data["items"][0]["name"]

    async def test_search_case_insensitive(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&search=terrible")
        data = resp.json()
        assert data["total"] == 1

    async def test_pagination_page_size(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&page_size=2&page=1")
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2

    async def test_pagination_second_page(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&page_size=2&page=2")
        data = resp.json()
        assert data["page"] == 2
        assert len(data["items"]) <= 2

    async def test_empty_result(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?search=nonexistent12345")
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []
        assert data["total_pages"] == 0

    async def test_combined_filters(self, seeded_client):
        resp = await seeded_client.get(
            "/api/v1/apps?sort=lowest_weighted&country=US&min_reviews=100&max_rating=2.0"
        )
        data = resp.json()
        for item in data["items"]:
            assert item["country_code"] == "US"
            assert item["rating_count"] >= 100
            assert item["average_rating"] <= 2.0

    async def test_returns_empty_on_empty_db(self, client):
        resp = await client.get("/api/v1/apps")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_invalid_sort_rejected(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=invalid_sort")
        assert resp.status_code == 422

    async def test_negative_page_rejected(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?page=-1")
        assert resp.status_code == 422

    async def test_page_size_over_100_rejected(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?page_size=200")
        assert resp.status_code == 422

    async def test_items_have_expected_fields(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps?sort=name&page_size=1")
        data = resp.json()
        if data["items"]:
            item = data["items"][0]
            expected_fields = {
                "id", "itunes_id", "name", "developer", "category_name",
                "country_code", "average_rating", "rating_count",
                "weighted_score", "price", "currency", "icon_url",
                "store_url", "current_version",
            }
            assert set(item.keys()) == expected_fields


class TestGetApp:
    async def test_returns_app_detail(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Terrible Game"
        assert data["itunes_id"] == 100001
        assert data["average_rating"] == 1.2
        assert data["rating_count"] == 5000

    async def test_includes_country(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1")
        data = resp.json()
        assert data["country"]["code"] == "US"
        assert data["country"]["name"] == "United States"

    async def test_includes_category(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1")
        data = resp.json()
        assert data["category"]["name"] == "Games"

    async def test_404_for_nonexistent(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/99999")
        assert resp.status_code == 404

    async def test_detail_has_all_fields(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1")
        data = resp.json()
        required_fields = {
            "id", "itunes_id", "name", "developer", "category", "country",
            "average_rating", "rating_count", "weighted_score",
            "current_version", "price", "currency", "icon_url", "store_url",
            "description", "content_rating", "release_date", "updated_date",
            "created_at", "updated_at", "bundle_id",
        }
        assert set(data.keys()) >= required_fields


class TestGetAppHistory:
    async def test_returns_history(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1/history")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 5  # 5 seeded snapshots

    async def test_history_ordered_by_date_desc(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1/history")
        data = resp.json()
        dates = [item["snapshot_date"] for item in data]
        assert dates == sorted(dates, reverse=True)

    async def test_history_items_have_fields(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1/history")
        data = resp.json()
        for item in data:
            assert "snapshot_date" in item
            assert "average_rating" in item
            assert "rating_count" in item
            assert "weighted_score" in item

    async def test_404_for_app_without_history(self, seeded_client):
        # App 5 ("Unrated App") has no rating history
        resp = await seeded_client.get("/api/v1/apps/5/history")
        assert resp.status_code == 404

    async def test_404_for_nonexistent_app_history(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/99999/history")
        assert resp.status_code == 404

    async def test_limit_parameter(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/1/history?limit=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2


class TestGetStats:
    async def test_stats_on_empty_db(self, client):
        resp = await client.get("/api/v1/apps/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_apps"] == 0
        assert data["total_countries"] == 0
        assert data["total_categories"] == 0
        assert data["last_crawl"] is None
        assert data["global_mean_rating"] is None

    async def test_stats_with_seeded_data(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_apps"] == 5
        assert data["total_countries"] == 2
        assert data["total_categories"] == 2
        assert data["last_crawl"] is not None
        assert data["min_rating_threshold"] == 100

    async def test_stats_has_all_fields(self, seeded_client):
        resp = await seeded_client.get("/api/v1/apps/stats")
        data = resp.json()
        expected = {
            "total_apps", "total_countries", "total_categories",
            "last_crawl", "global_mean_rating", "min_rating_threshold",
        }
        assert set(data.keys()) == expected
