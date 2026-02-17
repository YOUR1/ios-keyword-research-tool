"""
Tests for /api/v1/crawls endpoints — crawl job history.

Validates listing, filtering, detail retrieval, tenant isolation, and pagination
of crawl jobs.
"""

import pytest
from unittest.mock import patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import CrawlJob, UserKeyword
from app.models.user import User
from tests.conftest import create_test_user, auth_headers


async def _create_user_keyword_and_jobs(
    auth_client, db_session, email="crawluser@example.com"
):
    """Helper: create a user, keyword, and multiple crawl jobs directly in DB."""
    tokens = await create_test_user(auth_client, email=email, password="password123")
    headers = auth_headers(tokens["access_token"])

    # Create a keyword via API
    kw_resp = await auth_client.post(
        "/api/v1/keywords", headers=headers,
        json={"term": "testcrawl", "country_code": "US"},
    )
    keyword_id = kw_resp.json()["id"]

    # Look up the user ID
    result = await db_session.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one()

    # Insert crawl jobs directly in the DB
    jobs = []
    for i, status in enumerate(["completed", "completed", "failed", "pending"]):
        job = CrawlJob(
            keyword_id=keyword_id,
            user_id=user.id,
            status=status,
            apps_found=10 * (i + 1) if status == "completed" else 0,
        )
        db_session.add(job)
        jobs.append(job)

    await db_session.flush()
    return tokens, headers, keyword_id, user, jobs


class TestListCrawlJobs:
    async def test_list_crawl_jobs(self, auth_client, db_session):
        tokens, headers, keyword_id, user, jobs = await _create_user_keyword_and_jobs(
            auth_client, db_session,
        )

        resp = await auth_client.get("/api/v1/crawls", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 4
        assert len(data["items"]) == 4

    async def test_list_crawl_jobs_filter_status(self, auth_client, db_session):
        tokens, headers, keyword_id, user, jobs = await _create_user_keyword_and_jobs(
            auth_client, db_session,
        )

        resp = await auth_client.get(
            "/api/v1/crawls?status=completed", headers=headers,
        )
        data = resp.json()
        assert data["total"] == 2
        for item in data["items"]:
            assert item["status"] == "completed"

    async def test_list_crawl_jobs_filter_keyword(self, auth_client, db_session):
        tokens, headers, keyword_id, user, jobs = await _create_user_keyword_and_jobs(
            auth_client, db_session,
        )

        resp = await auth_client.get(
            f"/api/v1/crawls?keyword_id={keyword_id}", headers=headers,
        )
        data = resp.json()
        assert data["total"] == 4
        for item in data["items"]:
            assert item["keyword_id"] == keyword_id

    async def test_crawl_job_pagination(self, auth_client, db_session):
        tokens, headers, keyword_id, user, jobs = await _create_user_keyword_and_jobs(
            auth_client, db_session,
        )

        resp = await auth_client.get(
            "/api/v1/crawls?page=1&page_size=2", headers=headers,
        )
        data = resp.json()
        assert data["total"] == 4
        assert len(data["items"]) == 2
        assert data["total_pages"] == 2

        resp2 = await auth_client.get(
            "/api/v1/crawls?page=2&page_size=2", headers=headers,
        )
        data2 = resp2.json()
        assert len(data2["items"]) == 2


class TestGetCrawlJob:
    async def test_get_crawl_job(self, auth_client, db_session):
        tokens, headers, keyword_id, user, jobs = await _create_user_keyword_and_jobs(
            auth_client, db_session,
        )
        job_id = jobs[0].id

        resp = await auth_client.get(
            f"/api/v1/crawls/{job_id}", headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == job_id
        assert data["status"] == "completed"

    async def test_get_other_users_crawl_job(self, auth_client, db_session):
        # User A creates jobs
        tokens_a, headers_a, kw_id, user_a, jobs = await _create_user_keyword_and_jobs(
            auth_client, db_session, email="crawla@example.com",
        )
        job_id = jobs[0].id

        # User B tries to access
        tokens_b = await create_test_user(
            auth_client, email="crawlb@example.com", password="password123",
        )
        headers_b = auth_headers(tokens_b["access_token"])

        resp = await auth_client.get(
            f"/api/v1/crawls/{job_id}", headers=headers_b,
        )
        assert resp.status_code == 404


class TestTriggerCreatesJob:
    async def test_trigger_creates_job(self, auth_client, db_session):
        tokens = await create_test_user(
            auth_client, email="trigger@example.com", password="password123",
        )
        headers = auth_headers(tokens["access_token"])

        kw_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "testjob", "country_code": "US"},
        )
        keyword_id = kw_resp.json()["id"]

        with patch("app.api.v1.keywords.crawl_keyword_task", create=True):
            resp = await auth_client.post(
                f"/api/v1/keywords/{keyword_id}/crawl", headers=headers,
            )
        assert resp.status_code == 202
        job_data = resp.json()

        # Verify the job appears in the crawl jobs list
        list_resp = await auth_client.get("/api/v1/crawls", headers=headers)
        data = list_resp.json()
        assert data["total"] >= 1
        job_ids = [item["id"] for item in data["items"]]
        assert job_data["id"] in job_ids

    async def test_crawl_quota_exceeded(self, auth_client, db_session):
        """Free plan allows max 2 crawls per day."""
        tokens = await create_test_user(
            auth_client, email="quota@example.com", password="password123",
        )
        headers = auth_headers(tokens["access_token"])

        kw_resp = await auth_client.post(
            "/api/v1/keywords", headers=headers,
            json={"term": "quotatest", "country_code": "US"},
        )
        keyword_id = kw_resp.json()["id"]

        # Trigger 2 crawls (the free plan daily limit)
        for _ in range(2):
            with patch("app.api.v1.keywords.crawl_keyword_task", create=True):
                resp = await auth_client.post(
                    f"/api/v1/keywords/{keyword_id}/crawl", headers=headers,
                )
                assert resp.status_code == 202

        # 3rd crawl should be rejected
        with patch("app.api.v1.keywords.crawl_keyword_task", create=True):
            resp = await auth_client.post(
                f"/api/v1/keywords/{keyword_id}/crawl", headers=headers,
            )
        assert resp.status_code == 403
        assert "limit" in resp.json()["detail"].lower()
