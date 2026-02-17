"""
Tests for /api/v1/billing endpoints — plan listing and usage tracking.

Validates public plan listing, authenticated usage retrieval, and usage
changes after keyword creation.
"""

import pytest

from tests.conftest import create_test_user, auth_headers


class TestListPlans:
    async def test_list_plans_public(self, auth_client):
        """Plans endpoint does not require authentication."""
        resp = await auth_client.get("/api/v1/billing/plans")
        assert resp.status_code == 200
        data = resp.json()
        assert "plans" in data
        plans = data["plans"]
        assert len(plans) >= 2  # free + starter seeded

        plan_names = [p["name"] for p in plans]
        assert "free" in plan_names
        assert "starter" in plan_names

        # Verify plan structure
        free_plan = next(p for p in plans if p["name"] == "free")
        assert free_plan["max_keywords"] == 5
        assert free_plan["max_crawls_per_day"] == 2
        assert free_plan["price_cents_monthly"] == 0


class TestGetUsage:
    async def test_get_usage(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        resp = await auth_client.get("/api/v1/billing/usage", headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        # New user should have 0 usage
        assert data["keywords_used"] == 0
        assert data["keywords_limit"] == 5  # free plan
        assert data["crawls_today"] == 0
        assert data["crawls_limit"] == 2  # free plan
        assert data["results_stored"] == 0
        assert data["results_limit"] == 500  # free plan
        assert data["plan"]["name"] == "free"

    async def test_usage_after_keyword_creation(self, auth_client):
        tokens = await create_test_user(
            auth_client, email="usage@example.com", password="password123",
        )
        headers = auth_headers(tokens["access_token"])

        # Check initial usage
        resp = await auth_client.get("/api/v1/billing/usage", headers=headers)
        assert resp.json()["keywords_used"] == 0

        # Create two keywords
        await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "calculator", "country_code": "US"},
        )

        # Check usage increased
        resp = await auth_client.get("/api/v1/billing/usage", headers=headers)
        data = resp.json()
        assert data["keywords_used"] == 2
        assert data["keywords_limit"] == 5
