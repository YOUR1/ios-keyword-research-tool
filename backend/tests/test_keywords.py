"""
Tests for /api/v1/keywords endpoints — CRUD and crawl triggering.

Validates keyword creation, retrieval, updates, deletion, quota enforcement,
and tenant isolation.
"""

import pytest
from unittest.mock import patch

from tests.conftest import create_test_user, auth_headers


class TestCreateKeyword:
    async def test_create_keyword(self, auth_client):
        tokens = await create_test_user(auth_client)
        resp = await auth_client.post(
            "/api/v1/keywords",
            headers=auth_headers(tokens["access_token"]),
            json={"term": "flashlight", "country_code": "US"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["term"] == "flashlight"
        assert data["country_code"] == "US"
        assert data["crawl_frequency"] == "daily"
        assert data["is_active"] is True
        assert "id" in data

    async def test_create_keyword_duplicate(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        await auth_client.post(
            "/api/v1/keywords",
            headers=headers,
            json={"term": "calculator", "country_code": "US"},
        )
        resp = await auth_client.post(
            "/api/v1/keywords",
            headers=headers,
            json={"term": "calculator", "country_code": "US"},
        )
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]

    async def test_keyword_quota_exceeded(self, auth_client):
        """Free plan allows max 5 keywords."""
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        # Create 5 keywords (the free plan limit)
        for i in range(5):
            resp = await auth_client.post(
                "/api/v1/keywords",
                headers=headers,
                json={"term": f"keyword-{i}", "country_code": "US"},
            )
            assert resp.status_code == 201

        # 6th keyword should be rejected
        resp = await auth_client.post(
            "/api/v1/keywords",
            headers=headers,
            json={"term": "keyword-overflow", "country_code": "US"},
        )
        assert resp.status_code == 403
        assert "limit" in resp.json()["detail"].lower()


class TestListKeywords:
    async def test_list_keywords(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "calculator", "country_code": "GB"},
        )

        resp = await auth_client.get("/api/v1/keywords", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        assert "page" in data
        assert "total_pages" in data

    async def test_keyword_pagination(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        for i in range(4):
            await auth_client.post(
                "/api/v1/keywords", headers=headers,
                json={"term": f"term-{i}", "country_code": "US"},
            )

        resp = await auth_client.get(
            "/api/v1/keywords?page=1&page_size=2", headers=headers,
        )
        data = resp.json()
        assert data["total"] == 4
        assert len(data["items"]) == 2
        assert data["page"] == 1
        assert data["total_pages"] == 2

        resp2 = await auth_client.get(
            "/api/v1/keywords?page=2&page_size=2", headers=headers,
        )
        data2 = resp2.json()
        assert len(data2["items"]) == 2
        assert data2["page"] == 2

    async def test_unauthenticated_access(self, auth_client):
        resp = await auth_client.get("/api/v1/keywords")
        assert resp.status_code == 401


class TestGetKeyword:
    async def test_get_keyword(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        create_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = create_resp.json()["id"]

        resp = await auth_client.get(
            f"/api/v1/keywords/{keyword_id}", headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["term"] == "flashlight"
        assert "total_apps_found" in data
        assert "total_crawl_jobs" in data

    async def test_get_other_users_keyword(self, auth_client):
        # User A creates a keyword
        tokens_a = await create_test_user(
            auth_client, email="usera@example.com", password="password123",
        )
        headers_a = auth_headers(tokens_a["access_token"])

        create_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers_a,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = create_resp.json()["id"]

        # User B tries to access it
        tokens_b = await create_test_user(
            auth_client, email="userb@example.com", password="password123",
        )
        headers_b = auth_headers(tokens_b["access_token"])

        resp = await auth_client.get(
            f"/api/v1/keywords/{keyword_id}", headers=headers_b,
        )
        assert resp.status_code == 404


class TestUpdateKeyword:
    async def test_update_keyword(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        create_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = create_resp.json()["id"]

        resp = await auth_client.patch(
            f"/api/v1/keywords/{keyword_id}", headers=headers,
            json={"crawl_frequency": "weekly"},
        )
        assert resp.status_code == 200
        assert resp.json()["crawl_frequency"] == "weekly"

    async def test_toggle_keyword_active(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        create_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = create_resp.json()["id"]
        assert create_resp.json()["is_active"] is True

        # Toggle off
        resp = await auth_client.patch(
            f"/api/v1/keywords/{keyword_id}", headers=headers,
            json={"is_active": False},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

        # Toggle back on
        resp2 = await auth_client.patch(
            f"/api/v1/keywords/{keyword_id}", headers=headers,
            json={"is_active": True},
        )
        assert resp2.status_code == 200
        assert resp2.json()["is_active"] is True


class TestDeleteKeyword:
    async def test_delete_keyword(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        create_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = create_resp.json()["id"]

        resp = await auth_client.delete(
            f"/api/v1/keywords/{keyword_id}", headers=headers,
        )
        assert resp.status_code == 204

        # Verify it's gone
        get_resp = await auth_client.get(
            f"/api/v1/keywords/{keyword_id}", headers=headers,
        )
        assert get_resp.status_code == 404


class TestTriggerCrawl:
    async def test_trigger_crawl(self, auth_client):
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        create_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = create_resp.json()["id"]

        with patch("app.api.v1.keywords.crawl_keyword_task", create=True):
            resp = await auth_client.post(
                f"/api/v1/keywords/{keyword_id}/crawl", headers=headers,
            )
        assert resp.status_code == 202
        data = resp.json()
        assert data["keyword_id"] == keyword_id
        assert data["status"] == "pending"
