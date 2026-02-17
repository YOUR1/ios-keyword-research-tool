"""
Tests for /api/v1/results endpoints — tenant-scoped app results.

Validates listing, filtering, tenant isolation, and statistics for
keyword-app results.
"""

import pytest

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import CrawlJob, KeywordAppResult, UserKeyword
from app.models.user import User
from tests.conftest import create_test_user, auth_headers


async def _create_user_with_results(auth_client, db_session, email="results@example.com"):
    """
    Helper: create a user with keywords and app results linked to seeded apps.
    Seeded apps have IDs 1-5 (from seeded_db fixture).
    """
    tokens = await create_test_user(auth_client, email=email, password="password123")
    headers = auth_headers(tokens["access_token"])

    # Look up the user
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()

    # Create keywords directly in DB (to avoid quota issues)
    kw1 = UserKeyword(user_id=user.id, term="flashlight", country_code="US")
    kw2 = UserKeyword(user_id=user.id, term="calculator", country_code="US")
    db_session.add_all([kw1, kw2])
    await db_session.flush()

    # Link keyword results to seeded apps
    # kw1 -> apps 1, 2
    # kw2 -> apps 2, 3 (app 2 is shared between both keywords)
    results_data = [
        KeywordAppResult(keyword_id=kw1.id, app_id=1),
        KeywordAppResult(keyword_id=kw1.id, app_id=2),
        KeywordAppResult(keyword_id=kw2.id, app_id=2),
        KeywordAppResult(keyword_id=kw2.id, app_id=3),
    ]
    db_session.add_all(results_data)
    await db_session.flush()

    return tokens, headers, user, kw1, kw2


class TestListResults:
    async def test_list_results_empty(self, auth_client, db_session, seeded_db):
        tokens = await create_test_user(
            auth_client, email="empty@example.com", password="password123",
        )
        headers = auth_headers(tokens["access_token"])

        resp = await auth_client.get("/api/v1/results", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_results_with_data(self, auth_client, db_session, seeded_db):
        tokens, headers, user, kw1, kw2 = await _create_user_with_results(
            auth_client, db_session,
        )

        resp = await auth_client.get("/api/v1/results", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        # 3 unique apps (1, 2, 3) — app 2 is deduplicated
        assert data["total"] == 3
        assert len(data["items"]) == 3

        # Each item should have keywords list
        for item in data["items"]:
            assert "keywords" in item
            assert isinstance(item["keywords"], list)

    async def test_results_tenant_isolation(self, auth_client, db_session, seeded_db):
        # User A has results
        await _create_user_with_results(
            auth_client, db_session, email="tenanta@example.com",
        )

        # User B should see nothing
        tokens_b = await create_test_user(
            auth_client, email="tenantb@example.com", password="password123",
        )
        headers_b = auth_headers(tokens_b["access_token"])

        resp = await auth_client.get("/api/v1/results", headers=headers_b)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_results_filter_by_keyword(self, auth_client, db_session, seeded_db):
        tokens, headers, user, kw1, kw2 = await _create_user_with_results(
            auth_client, db_session, email="filter@example.com",
        )

        # Filter by kw1 — should return apps 1 and 2
        resp = await auth_client.get(
            f"/api/v1/results?keyword_id={kw1.id}", headers=headers,
        )
        data = resp.json()
        assert data["total"] == 2
        app_ids = {item["id"] for item in data["items"]}
        assert app_ids == {1, 2}


class TestResultStats:
    async def test_result_stats(self, auth_client, db_session, seeded_db):
        tokens, headers, user, kw1, kw2 = await _create_user_with_results(
            auth_client, db_session, email="stats@example.com",
        )

        resp = await auth_client.get("/api/v1/results/stats", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        # 3 unique apps across both keywords
        assert data["total_apps"] == 3
        assert data["total_keywords"] == 2
        assert data["active_keywords"] == 2
        assert data["total_crawl_jobs"] == 0
        assert data["last_crawl_at"] is None
