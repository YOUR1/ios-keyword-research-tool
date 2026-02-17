"""Tests for the reviews API endpoint."""

import pytest


class TestListReviews:
    """Tests for GET /api/v1/apps/{app_id}/reviews."""

    async def test_list_reviews_empty(self, seeded_client):
        """App with no reviews returns empty items + zero summary."""
        resp = await seeded_client.get("/api/v1/apps/3/reviews")
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["summary"]["total_reviews"] == 0

    async def test_list_reviews_paginated(self, seeded_client):
        """Returns correct items, total, and page count."""
        resp = await seeded_client.get("/api/v1/apps/1/reviews?page_size=2&page=1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3
        assert data["total_pages"] == 2
        assert data["page"] == 1

    async def test_list_reviews_sort_newest(self, seeded_client):
        """Reviews ordered by review_date desc by default."""
        resp = await seeded_client.get("/api/v1/apps/1/reviews?sort=newest")
        assert resp.status_code == 200
        data = resp.json()
        dates = [item["review_date"] for item in data["items"]]
        # Should be descending
        assert dates == sorted(dates, reverse=True)

    async def test_list_reviews_sort_lowest(self, seeded_client):
        """Reviews ordered by rating asc when sort=lowest."""
        resp = await seeded_client.get("/api/v1/apps/1/reviews?sort=lowest")
        assert resp.status_code == 200
        data = resp.json()
        ratings = [item["rating"] for item in data["items"]]
        assert ratings == sorted(ratings)

    async def test_list_reviews_filter_language(self, seeded_client):
        """Only returns reviews matching language param."""
        resp = await seeded_client.get("/api/v1/apps/1/reviews?language=en")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        for item in data["items"]:
            assert item["language"] == "en"

    async def test_list_reviews_filter_language_nl(self, seeded_client):
        """Returns only Dutch reviews."""
        resp = await seeded_client.get("/api/v1/apps/1/reviews?language=nl")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["author_name"] == "Dutch User"

    async def test_list_reviews_summary(self, seeded_client):
        """Response includes correct rating_distribution and total_reviews."""
        resp = await seeded_client.get("/api/v1/apps/1/reviews")
        assert resp.status_code == 200
        data = resp.json()
        summary = data["summary"]
        assert summary["total_reviews"] == 3
        assert summary["rating_distribution"]["1"] == 2
        assert summary["rating_distribution"]["2"] == 1
        assert summary["average_review_rating"] is not None

    async def test_list_reviews_404(self, seeded_client):
        """Non-existent app_id returns 404."""
        resp = await seeded_client.get("/api/v1/apps/99999/reviews")
        assert resp.status_code == 404
