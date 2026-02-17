"""
Integration tests for the keyword crawl pipeline.

Tests the full flow: user creates keyword -> triggers crawl -> CrawlJob created ->
keyword_crawler.crawl_keyword() executes -> searches iTunes API -> upserts apps ->
creates KeywordAppResult entries -> updates job status.

Since tests use SQLite in-memory (no PostgreSQL), we mock/patch:
- itunes_client.search / search_by_genre (no real HTTP calls)
- upsert_app (uses pg_insert internally, replaced with ORM-based insert)
- pg_insert in keyword_crawler (replaced with SQLite-compatible insert)
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select, func
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.keyword import CrawlJob, KeywordAppResult, UserKeyword
from app.models.models import App, Category, Country
from app.models.user import Plan, User
from app.core.auth import create_access_token, hash_password
from app.services.usage import (
    check_crawl_quota,
    check_keyword_quota,
)
from tests.conftest import auth_headers, create_test_user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_itunes_raw(itunes_id: int, name: str, rating: float, count: int) -> dict:
    """Build a fake raw iTunes API response dict for a single app."""
    return {
        "trackId": itunes_id,
        "bundleId": f"com.test.{name.lower().replace(' ', '')}",
        "trackName": name,
        "artistName": "Test Developer",
        "averageUserRating": rating,
        "userRatingCount": count,
        "version": "1.0",
        "price": 0.0,
        "currency": "USD",
        "artworkUrl512": f"https://example.com/icon_{itunes_id}.png",
        "trackViewUrl": f"https://apps.apple.com/us/app/id{itunes_id}",
        "description": f"Description for {name}",
        "contentAdvisoryRating": "4+",
        "primaryGenreId": 6014,
        "primaryGenreName": "Games",
        "releaseDate": "2024-01-15T00:00:00Z",
        "currentVersionReleaseDate": "2025-06-01T00:00:00Z",
    }


async def _mock_upsert_app(db, parsed, country, category, global_mean, min_ratings):
    """
    SQLite-compatible replacement for upsert_app.

    Instead of using pg_insert with ON CONFLICT, does a regular ORM
    select-then-insert-or-update.
    """
    if not parsed.get("itunes_id"):
        return None

    result = await db.execute(
        select(App).where(
            App.itunes_id == parsed["itunes_id"],
            App.country_id == country.id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.name = parsed["name"]
        existing.developer = parsed.get("developer")
        existing.average_rating = parsed.get("average_rating")
        existing.rating_count = parsed.get("rating_count", 0)
        await db.flush()
        return existing.id
    else:
        app = App(
            itunes_id=parsed["itunes_id"],
            bundle_id=parsed.get("bundle_id"),
            name=parsed["name"],
            developer=parsed.get("developer"),
            category_id=category.id if category else None,
            country_id=country.id,
            average_rating=parsed.get("average_rating"),
            rating_count=parsed.get("rating_count", 0),
            price=parsed.get("price", 0.0),
            currency=parsed.get("currency", "USD"),
            icon_url=parsed.get("icon_url"),
            store_url=parsed.get("store_url"),
            description=parsed.get("description"),
            content_rating=parsed.get("content_rating"),
        )
        db.add(app)
        await db.flush()
        return app.id


class _SQLiteInsertWrapper:
    """
    Drop-in replacement for ``pg_insert`` that generates a SQLite-compatible
    INSERT ... ON CONFLICT statement via ``sqlalchemy.dialects.sqlite.insert``.
    """

    _CONSTRAINT_TO_COLUMNS = {
        "uq_keyword_app": ["keyword_id", "app_id"],
        "uq_app_country": ["itunes_id", "country_id"],
    }

    def __init__(self, table):
        self._table = table
        self._values_dict: dict = {}

    def values(self, **kwargs):
        self._values_dict = kwargs
        return self

    def on_conflict_do_update(self, *, constraint=None, set_=None, **kwargs):
        stmt = sqlite_insert(self._table).values(**self._values_dict)
        elements = self._CONSTRAINT_TO_COLUMNS.get(constraint, [])
        return stmt.on_conflict_do_update(
            index_elements=elements,
            set_=set_ or {},
        )

    def on_conflict_do_nothing(self, **kwargs):
        stmt = sqlite_insert(self._table).values(**self._values_dict)
        return stmt.on_conflict_do_nothing()


def _sqlite_pg_insert(table):
    """Factory that returns a SQLite-compatible insert wrapper."""
    return _SQLiteInsertWrapper(table)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
async def pipeline_db(db_session: AsyncSession):
    """
    Seed the database with the minimal data needed for crawl pipeline tests:
    plans, a country, a category, a user, and a keyword.
    """
    # Plans
    free_plan = Plan(
        id=1, name="free", max_keywords=5, max_crawls_per_day=2,
        max_results_stored=500, price_cents_monthly=0,
    )
    starter_plan = Plan(
        id=2, name="starter", max_keywords=25, max_crawls_per_day=10,
        max_results_stored=5000, price_cents_monthly=999,
    )
    db_session.add_all([free_plan, starter_plan])
    await db_session.flush()

    # Country
    us = Country(id=1, code="US", name="United States", active=True)
    db_session.add(us)
    await db_session.flush()

    # Category
    games = Category(id=1, itunes_id=6014, name="Games")
    db_session.add(games)
    await db_session.flush()

    # User (on free plan: max 5 keywords, max 2 crawls/day)
    user = User(
        id=1,
        email="pipeline@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Pipeline Tester",
        plan_id=free_plan.id,
    )
    db_session.add(user)
    await db_session.flush()

    # Keyword
    keyword = UserKeyword(
        id=1,
        user_id=user.id,
        term="flashlight",
        country_code="US",
        crawl_frequency="daily",
        is_active=True,
        next_run_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db_session.add(keyword)
    await db_session.flush()

    await db_session.commit()

    return {
        "user": user,
        "plan": free_plan,
        "keyword": keyword,
        "country": us,
        "category": games,
    }


@pytest.fixture()
def user_token(pipeline_db):
    """Return a valid JWT access token for the pipeline test user."""
    user = pipeline_db["user"]
    return create_access_token(user.id, user.role)


@pytest.fixture()
def user_headers(user_token):
    """Return auth headers for the pipeline test user."""
    return auth_headers(user_token)


@pytest.fixture()
def fake_itunes_results():
    """Three fake iTunes search results."""
    return [
        _make_itunes_raw(900001, "Bad Flashlight", 1.2, 3000),
        _make_itunes_raw(900002, "Terrible Torch", 1.5, 1500),
        _make_itunes_raw(900003, "Awful Light", 2.0, 500),
    ]


# ---------------------------------------------------------------------------
# 1. Crawl trigger endpoint tests
# ---------------------------------------------------------------------------

class TestCrawlTriggerEndpoint:
    """Tests for POST /api/v1/keywords/{id}/crawl via the FastAPI test client."""

    async def test_trigger_creates_pending_job(self, auth_client):
        """POST /keywords/{id}/crawl creates a CrawlJob with status 'pending'."""
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        # Create a keyword first
        kw_resp = await auth_client.post(
            "/api/v1/keywords",
            headers=headers,
            json={"term": "flashlight", "country_code": "US"},
        )
        keyword_id = kw_resp.json()["id"]

        # Trigger crawl
        resp = await auth_client.post(
            f"/api/v1/keywords/{keyword_id}/crawl",
            headers=headers,
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["status"] == "pending"
        assert data["keyword_id"] == keyword_id
        assert data["apps_found"] == 0
        assert data["apps_new"] == 0

    async def test_trigger_returns_403_when_quota_exhausted(self, auth_client):
        """POST /keywords/{id}/crawl returns 403 when daily crawl quota is used up."""
        tokens = await create_test_user(auth_client)
        headers = auth_headers(tokens["access_token"])

        # Create a keyword
        kw_resp = await auth_client.post(
            "/api/v1/keywords",
            headers=headers,
            json={"term": "quota-test", "country_code": "US"},
        )
        keyword_id = kw_resp.json()["id"]

        # Free plan allows 2 crawls/day. Trigger 2 crawls to exhaust quota.
        for _ in range(2):
            resp = await auth_client.post(
                f"/api/v1/keywords/{keyword_id}/crawl",
                headers=headers,
            )
            assert resp.status_code == 202

        # Third crawl should be rejected
        resp = await auth_client.post(
            f"/api/v1/keywords/{keyword_id}/crawl",
            headers=headers,
        )
        assert resp.status_code == 403
        assert "limit" in resp.json()["detail"].lower()

    async def test_trigger_other_users_keyword_returns_404(self, auth_client):
        """POST /keywords/{id}/crawl for another user's keyword returns 404."""
        # User A creates a keyword
        tokens_a = await create_test_user(
            auth_client, email="crawl_a@test.com", password="password123",
        )
        headers_a = auth_headers(tokens_a["access_token"])

        kw_resp = await auth_client.post(
            "/api/v1/keywords",
            headers=headers_a,
            json={"term": "user-a-kw", "country_code": "US"},
        )
        keyword_id = kw_resp.json()["id"]

        # User B tries to crawl it
        tokens_b = await create_test_user(
            auth_client, email="crawl_b@test.com", password="password123",
        )
        headers_b = auth_headers(tokens_b["access_token"])

        resp = await auth_client.post(
            f"/api/v1/keywords/{keyword_id}/crawl",
            headers=headers_b,
        )
        assert resp.status_code == 404

    async def test_job_records_correct_keyword_and_user(self, auth_client):
        """CrawlJob response contains the correct keyword_id; user_id is implicit."""
        tokens = await create_test_user(
            auth_client, email="records@test.com", password="password123",
        )
        headers = auth_headers(tokens["access_token"])

        kw_resp = await auth_client.post(
            "/api/v1/keywords",
            headers=headers,
            json={"term": "tracking-test", "country_code": "US"},
        )
        keyword_id = kw_resp.json()["id"]

        resp = await auth_client.post(
            f"/api/v1/keywords/{keyword_id}/crawl",
            headers=headers,
        )
        assert resp.status_code == 202
        data = resp.json()
        assert data["keyword_id"] == keyword_id
        # id should be a positive integer
        assert isinstance(data["id"], int) and data["id"] > 0


# ---------------------------------------------------------------------------
# 2. crawl_keyword service tests
# ---------------------------------------------------------------------------

class TestCrawlKeywordService:
    """
    Unit/integration tests for keyword_crawler.crawl_keyword().

    Patches itunes_client (no real HTTP), upsert_app (no pg_insert),
    and pg_insert in keyword_crawler (SQLite-compatible replacement).
    """

    async def test_job_transitions_pending_to_completed(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """crawl_keyword transitions job status: pending -> running -> completed."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        # Create a pending job
        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()
        job_id = job.id

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            mock_client.search_by_genre = AsyncMock(return_value=fake_itunes_results)

            result = await crawl_keyword(db_session, job_id)

        assert result["status"] == "completed"

        # Re-fetch from DB to confirm persisted state
        await db_session.refresh(job)
        assert job.status == "completed"
        assert job.started_at is not None
        assert job.completed_at is not None

    async def test_apps_upserted_into_apps_table(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """After crawl, the discovered apps exist in the apps table."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        # Verify apps are in the database
        result = await db_session.execute(
            select(func.count(App.id)).where(
                App.itunes_id.in_([900001, 900002, 900003])
            )
        )
        count = result.scalar()
        assert count == 3

        # Spot-check one app
        result = await db_session.execute(
            select(App).where(App.itunes_id == 900001)
        )
        app = result.scalar_one()
        assert app.name == "Bad Flashlight"
        assert app.average_rating == 1.2
        assert app.rating_count == 3000

    async def test_keyword_app_results_created(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """crawl_keyword creates KeywordAppResult junction records."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        result = await db_session.execute(
            select(KeywordAppResult).where(
                KeywordAppResult.keyword_id == keyword.id,
            )
        )
        results = result.scalars().all()
        assert len(results) == 3

        # Each result should reference the correct job
        for r in results:
            assert r.crawl_job_id == job.id
            assert r.keyword_id == keyword.id

    async def test_keyword_timestamps_updated(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """After crawl, keyword.last_crawled_at is set and next_run_at is rescheduled."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]
        assert keyword.last_crawled_at is None

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        await db_session.refresh(keyword)
        assert keyword.last_crawled_at is not None

        # Daily frequency -> next_run_at should be roughly 1 day from now
        assert keyword.next_run_at is not None
        expected_next = datetime.utcnow() + timedelta(days=1)
        delta = abs((keyword.next_run_at - expected_next).total_seconds())
        assert delta < 60  # within 60 seconds

    async def test_duplicate_apps_no_duplicate_results(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """Running crawl twice with the same apps does not create duplicate KeywordAppResult rows."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        # First crawl
        job1 = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job1)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job1.id)

        result = await db_session.execute(
            select(func.count(KeywordAppResult.id)).where(
                KeywordAppResult.keyword_id == keyword.id,
            )
        )
        count_after_first = result.scalar()
        assert count_after_first == 3

        # Second crawl with the same apps
        job2 = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job2)
        await db_session.flush()

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job2.id)

        result = await db_session.execute(
            select(func.count(KeywordAppResult.id)).where(
                KeywordAppResult.keyword_id == keyword.id,
            )
        )
        count_after_second = result.scalar()
        # Same 3 apps - should not have doubled
        assert count_after_second == 3

        # But the crawl_job_id should be updated to the second job
        result = await db_session.execute(
            select(KeywordAppResult).where(
                KeywordAppResult.keyword_id == keyword.id,
            )
        )
        for kar in result.scalars().all():
            assert kar.crawl_job_id == job2.id

    async def test_job_counts_set_correctly(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """Job's apps_found and apps_new are set after crawl completes."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            result = await crawl_keyword(db_session, job.id)

        assert result["apps_found"] == 3
        assert result["apps_upserted"] == 3

        await db_session.refresh(job)
        assert job.apps_found == 3
        assert job.apps_new == 3

    async def test_failed_crawl_sets_error_status(
        self, db_session, pipeline_db,
    ):
        """When the iTunes API raises an exception, the job is marked as failed."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        # iTunes API raises an error
        mock_search = AsyncMock(side_effect=Exception("iTunes API timeout"))

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            result = await crawl_keyword(db_session, job.id)

        assert result["status"] == "failed"
        assert "iTunes API timeout" in result["error"]

        await db_session.refresh(job)
        assert job.status == "failed"
        assert job.error_message is not None
        assert "iTunes API timeout" in job.error_message
        assert job.apps_found == 0

    async def test_crawl_with_category_uses_search_by_genre(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """When keyword has a category_id, crawl uses itunes_client.search_by_genre."""
        from app.services.keyword_crawler import crawl_keyword

        user = pipeline_db["user"]
        category = pipeline_db["category"]

        # Create a keyword WITH a category
        keyword_with_cat = UserKeyword(
            user_id=user.id,
            term="puzzle",
            country_code="US",
            category_id=category.id,
            crawl_frequency="daily",
            is_active=True,
        )
        db_session.add(keyword_with_cat)
        await db_session.flush()

        job = CrawlJob(
            keyword_id=keyword_with_cat.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=[])
        mock_search_by_genre = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            mock_client.search_by_genre = mock_search_by_genre
            await crawl_keyword(db_session, job.id)

        # search_by_genre should have been called (category is set)
        mock_search_by_genre.assert_called_once()
        call_kwargs = mock_search_by_genre.call_args
        assert call_kwargs.kwargs.get("genre_id") == category.itunes_id

        # Plain search should NOT have been called
        mock_search.assert_not_called()

    async def test_manual_frequency_sets_next_run_to_none(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """A keyword with crawl_frequency='manual' gets next_run_at=None after crawl."""
        from app.services.keyword_crawler import crawl_keyword

        user = pipeline_db["user"]

        manual_kw = UserKeyword(
            user_id=user.id,
            term="manual-test",
            country_code="US",
            crawl_frequency="manual",
            is_active=True,
            next_run_at=None,
        )
        db_session.add(manual_kw)
        await db_session.flush()

        job = CrawlJob(
            keyword_id=manual_kw.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        await db_session.refresh(manual_kw)
        assert manual_kw.next_run_at is None
        assert manual_kw.last_crawled_at is not None

    async def test_daily_frequency_sets_next_run(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """A keyword with crawl_frequency='daily' gets next_run_at ~= now + 1 day."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]
        assert keyword.crawl_frequency == "daily"

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        await db_session.refresh(keyword)
        assert keyword.next_run_at is not None
        expected = datetime.utcnow() + timedelta(days=1)
        delta = abs((keyword.next_run_at - expected).total_seconds())
        assert delta < 60

    async def test_weekly_frequency_sets_next_run(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """A keyword with crawl_frequency='weekly' gets next_run_at ~= now + 7 days."""
        from app.services.keyword_crawler import crawl_keyword

        user = pipeline_db["user"]

        weekly_kw = UserKeyword(
            user_id=user.id,
            term="weekly-test",
            country_code="US",
            crawl_frequency="weekly",
            is_active=True,
        )
        db_session.add(weekly_kw)
        await db_session.flush()

        job = CrawlJob(
            keyword_id=weekly_kw.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        await db_session.refresh(weekly_kw)
        assert weekly_kw.next_run_at is not None
        expected = datetime.utcnow() + timedelta(weeks=1)
        delta = abs((weekly_kw.next_run_at - expected).total_seconds())
        assert delta < 60

    async def test_nonexistent_job_raises_error(self, db_session, pipeline_db):
        """crawl_keyword raises ValueError for a non-existent job ID."""
        from app.services.keyword_crawler import crawl_keyword

        with pytest.raises(ValueError, match="CrawlJob 99999 not found"):
            await crawl_keyword(db_session, 99999)

    async def test_empty_itunes_results(
        self, db_session, pipeline_db,
    ):
        """When iTunes returns no results, job completes with 0 apps."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=[])

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            result = await crawl_keyword(db_session, job.id)

        assert result["status"] == "completed"
        assert result["apps_found"] == 0
        assert result["apps_upserted"] == 0

        await db_session.refresh(job)
        assert job.status == "completed"
        assert job.apps_found == 0

    async def test_job_duration_recorded(
        self, db_session, pipeline_db, fake_itunes_results,
    ):
        """Job records a non-zero duration_seconds."""
        from app.services.keyword_crawler import crawl_keyword

        keyword = pipeline_db["keyword"]
        user = pipeline_db["user"]

        job = CrawlJob(
            keyword_id=keyword.id, user_id=user.id, status="pending",
        )
        db_session.add(job)
        await db_session.flush()

        mock_search = AsyncMock(return_value=fake_itunes_results)

        with (
            patch("app.services.keyword_crawler.itunes_client") as mock_client,
            patch("app.services.keyword_crawler.upsert_app", side_effect=_mock_upsert_app),
            patch("app.services.keyword_crawler.pg_insert", _sqlite_pg_insert),
        ):
            mock_client.search = mock_search
            await crawl_keyword(db_session, job.id)

        await db_session.refresh(job)
        assert job.duration_seconds is not None
        assert job.duration_seconds >= 0


# ---------------------------------------------------------------------------
# 3. Quota enforcement tests
# ---------------------------------------------------------------------------

class TestQuotaEnforcement:
    """Direct tests for check_crawl_quota and check_keyword_quota."""

    async def test_crawl_quota_under_limit(self, db_session, pipeline_db):
        """check_crawl_quota returns True when user has not used all daily crawls."""
        user = pipeline_db["user"]

        # Load user with plan relationship
        result = await db_session.execute(
            select(User).where(User.id == user.id)
        )
        user = result.scalar_one()
        user.plan = pipeline_db["plan"]

        # No crawl jobs today -> should be under limit
        allowed = await check_crawl_quota(db_session, user)
        assert allowed is True

    async def test_crawl_quota_at_limit(self, db_session, pipeline_db):
        """check_crawl_quota returns False when user has exhausted daily crawls."""
        user = pipeline_db["user"]
        keyword = pipeline_db["keyword"]

        result = await db_session.execute(
            select(User).where(User.id == user.id)
        )
        user = result.scalar_one()
        user.plan = pipeline_db["plan"]

        # Free plan: max_crawls_per_day = 2
        # Create 2 jobs dated today
        for _ in range(2):
            job = CrawlJob(
                keyword_id=keyword.id,
                user_id=user.id,
                status="completed",
            )
            db_session.add(job)
        await db_session.flush()

        allowed = await check_crawl_quota(db_session, user)
        assert allowed is False

    async def test_crawl_quota_exactly_one_under(self, db_session, pipeline_db):
        """check_crawl_quota returns True when exactly one crawl slot remains."""
        user = pipeline_db["user"]
        keyword = pipeline_db["keyword"]

        result = await db_session.execute(
            select(User).where(User.id == user.id)
        )
        user = result.scalar_one()
        user.plan = pipeline_db["plan"]

        # Free plan: max_crawls_per_day = 2, create 1 job
        job = CrawlJob(
            keyword_id=keyword.id,
            user_id=user.id,
            status="completed",
        )
        db_session.add(job)
        await db_session.flush()

        allowed = await check_crawl_quota(db_session, user)
        assert allowed is True

    async def test_keyword_quota_under_limit(self, db_session, pipeline_db):
        """check_keyword_quota returns True when user has fewer keywords than limit."""
        user = pipeline_db["user"]

        result = await db_session.execute(
            select(User).where(User.id == user.id)
        )
        user = result.scalar_one()
        user.plan = pipeline_db["plan"]

        # Already has 1 keyword from pipeline_db, free plan allows 5
        allowed = await check_keyword_quota(db_session, user)
        assert allowed is True

    async def test_keyword_quota_at_limit(self, db_session, pipeline_db):
        """check_keyword_quota returns False when user has reached the keyword limit."""
        user = pipeline_db["user"]

        result = await db_session.execute(
            select(User).where(User.id == user.id)
        )
        user = result.scalar_one()
        user.plan = pipeline_db["plan"]

        # Free plan: max_keywords = 5. Already have 1 from pipeline_db. Add 4 more.
        for i in range(4):
            kw = UserKeyword(
                user_id=user.id,
                term=f"quota-kw-{i}",
                country_code="US",
                crawl_frequency="daily",
            )
            db_session.add(kw)
        await db_session.flush()

        allowed = await check_keyword_quota(db_session, user)
        assert allowed is False

    async def test_keyword_quota_exactly_one_under(self, db_session, pipeline_db):
        """check_keyword_quota returns True when exactly one keyword slot remains."""
        user = pipeline_db["user"]

        result = await db_session.execute(
            select(User).where(User.id == user.id)
        )
        user = result.scalar_one()
        user.plan = pipeline_db["plan"]

        # Free plan: max_keywords = 5. Already have 1. Add 3 more (total 4).
        for i in range(3):
            kw = UserKeyword(
                user_id=user.id,
                term=f"almost-full-{i}",
                country_code="US",
                crawl_frequency="daily",
            )
            db_session.add(kw)
        await db_session.flush()

        allowed = await check_keyword_quota(db_session, user)
        assert allowed is True


# ---------------------------------------------------------------------------
# 4. Dispatcher logic tests
# ---------------------------------------------------------------------------

class TestDispatcherLogic:
    """
    Tests for the dispatch query logic that selects keywords due for crawling.

    Since dispatch_due_keywords is a Celery task that requires Redis and a real
    Celery worker, we test the underlying query logic directly -- the same
    SELECT that dispatch_due_keywords uses internally.
    """

    @staticmethod
    async def _get_due_keywords(db: AsyncSession) -> list[UserKeyword]:
        """
        Replicate the query from dispatch_due_keywords:
        active keywords where next_run_at <= now and frequency != manual.
        """
        now = datetime.utcnow()
        result = await db.execute(
            select(UserKeyword).where(
                UserKeyword.is_active == True,  # noqa: E712
                UserKeyword.next_run_at <= now,
                UserKeyword.crawl_frequency != "manual",
            )
        )
        return list(result.scalars().all())

    async def test_past_next_run_at_picked_up(self, db_session, pipeline_db):
        """Keywords with next_run_at in the past are returned by the dispatch query."""
        user = pipeline_db["user"]

        # Keyword due 1 hour ago
        past_kw = UserKeyword(
            user_id=user.id,
            term="past-due",
            country_code="US",
            crawl_frequency="daily",
            is_active=True,
            next_run_at=datetime.utcnow() - timedelta(hours=1),
        )
        db_session.add(past_kw)
        await db_session.flush()

        due = await self._get_due_keywords(db_session)
        due_ids = [k.id for k in due]
        assert past_kw.id in due_ids

    async def test_future_next_run_at_skipped(self, db_session, pipeline_db):
        """Keywords with next_run_at in the future are NOT returned by the dispatch query."""
        user = pipeline_db["user"]

        future_kw = UserKeyword(
            user_id=user.id,
            term="not-yet-due",
            country_code="US",
            crawl_frequency="daily",
            is_active=True,
            next_run_at=datetime.utcnow() + timedelta(hours=12),
        )
        db_session.add(future_kw)
        await db_session.flush()

        due = await self._get_due_keywords(db_session)
        due_ids = [k.id for k in due]
        assert future_kw.id not in due_ids

    async def test_manual_frequency_not_auto_dispatched(self, db_session, pipeline_db):
        """Keywords with crawl_frequency='manual' are never auto-dispatched."""
        user = pipeline_db["user"]

        manual_kw = UserKeyword(
            user_id=user.id,
            term="manual-no-dispatch",
            country_code="US",
            crawl_frequency="manual",
            is_active=True,
            next_run_at=datetime.utcnow() - timedelta(days=1),  # overdue
        )
        db_session.add(manual_kw)
        await db_session.flush()

        due = await self._get_due_keywords(db_session)
        due_ids = [k.id for k in due]
        assert manual_kw.id not in due_ids

    async def test_inactive_keyword_not_dispatched(self, db_session, pipeline_db):
        """Inactive keywords are excluded from dispatch even when overdue."""
        user = pipeline_db["user"]

        inactive_kw = UserKeyword(
            user_id=user.id,
            term="inactive-overdue",
            country_code="US",
            crawl_frequency="daily",
            is_active=False,
            next_run_at=datetime.utcnow() - timedelta(hours=2),
        )
        db_session.add(inactive_kw)
        await db_session.flush()

        due = await self._get_due_keywords(db_session)
        due_ids = [k.id for k in due]
        assert inactive_kw.id not in due_ids

    async def test_null_next_run_at_not_dispatched(self, db_session, pipeline_db):
        """Keywords with next_run_at=None are not dispatched."""
        user = pipeline_db["user"]

        null_kw = UserKeyword(
            user_id=user.id,
            term="null-schedule",
            country_code="US",
            crawl_frequency="daily",
            is_active=True,
            next_run_at=None,
        )
        db_session.add(null_kw)
        await db_session.flush()

        due = await self._get_due_keywords(db_session)
        due_ids = [k.id for k in due]
        assert null_kw.id not in due_ids

    async def test_multiple_due_keywords_all_returned(self, db_session, pipeline_db):
        """When multiple keywords are overdue, all are returned."""
        user = pipeline_db["user"]

        kw_ids = []
        for i in range(3):
            kw = UserKeyword(
                user_id=user.id,
                term=f"batch-due-{i}",
                country_code="US",
                crawl_frequency="weekly",
                is_active=True,
                next_run_at=datetime.utcnow() - timedelta(minutes=10 * (i + 1)),
            )
            db_session.add(kw)
            await db_session.flush()
            kw_ids.append(kw.id)

        due = await self._get_due_keywords(db_session)
        due_ids = [k.id for k in due]
        for kid in kw_ids:
            assert kid in due_ids
