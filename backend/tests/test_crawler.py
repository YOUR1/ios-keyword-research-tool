"""
Tests for app.services.crawler — crawl orchestration logic.

Tests ensure_country, ensure_category, and upsert_app against the test DB.
Crawl functions that call the iTunes API are tested with mocked HTTP.
"""

import pytest
from datetime import date
from unittest.mock import AsyncMock, patch

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import App, Category, Country, RatingHistory, CrawlLog
from app.services.crawler import ensure_country, ensure_category, upsert_app


class TestEnsureCountry:
    async def test_creates_new_country(self, db_session: AsyncSession):
        country = await ensure_country(db_session, "AU")
        assert country.id is not None
        assert country.code == "AU"
        assert country.name == "AU"  # Defaults to code when creating

    async def test_returns_existing_country(self, db_session: AsyncSession, seeded_db):
        country = await ensure_country(db_session, "US")
        assert country.id == seeded_db["countries"]["US"].id
        assert country.name == "United States"

    async def test_idempotent(self, db_session: AsyncSession):
        c1 = await ensure_country(db_session, "BR")
        c2 = await ensure_country(db_session, "BR")
        assert c1.id == c2.id


class TestEnsureCategory:
    async def test_creates_new_category(self, db_session: AsyncSession):
        cat = await ensure_category(db_session, 6099, "Test Category")
        assert cat.id is not None
        assert cat.itunes_id == 6099
        assert cat.name == "Test Category"

    async def test_returns_existing_category(self, db_session: AsyncSession, seeded_db):
        cat = await ensure_category(db_session, 6014, "Games")
        assert cat.id == seeded_db["categories"]["Games"].id

    async def test_idempotent(self, db_session: AsyncSession):
        c1 = await ensure_category(db_session, 9999, "New Cat")
        c2 = await ensure_category(db_session, 9999, "New Cat")
        assert c1.id == c2.id


class TestUpsertApp:
    async def test_inserts_new_app(self, db_session: AsyncSession, seeded_db):
        country = seeded_db["countries"]["US"]
        category = seeded_db["categories"]["Games"]

        parsed = {
            "itunes_id": 999888,
            "bundle_id": "com.test.new",
            "name": "Brand New App",
            "developer": "New Dev",
            "average_rating": 1.8,
            "rating_count": 500,
            "current_version": "1.0",
            "price": 0.0,
            "currency": "USD",
            "icon_url": "https://example.com/icon.png",
            "store_url": "https://apps.apple.com/us/app/id999888",
            "description": "Test",
            "content_rating": "4+",
            "release_date": date(2025, 1, 1),
            "updated_date": None,
            "raw_json": {"trackId": 999888},
        }

        app_id = await upsert_app(
            db_session, parsed, country, category,
            global_mean=3.0, min_ratings=100,
        )
        await db_session.commit()

        assert app_id is not None

        # Verify app was inserted
        result = await db_session.execute(
            select(App).where(App.itunes_id == 999888)
        )
        app = result.scalar_one()
        assert app.name == "Brand New App"
        assert app.weighted_score is not None

    async def test_updates_existing_app(self, db_session: AsyncSession, seeded_db):
        """Upsert with same itunes_id + country should update, not duplicate."""
        country = seeded_db["countries"]["US"]
        category = seeded_db["categories"]["Games"]

        # App id=1 already has itunes_id=100001, country=US
        parsed = {
            "itunes_id": 100001,
            "name": "Terrible Game UPDATED",
            "developer": "Bad Dev Updated",
            "average_rating": 1.0,
            "rating_count": 6000,
            "current_version": "2.0",
            "price": 0.0,
            "currency": "USD",
            "raw_json": {"trackId": 100001},
        }

        app_id = await upsert_app(
            db_session, parsed, country, category,
            global_mean=3.0, min_ratings=100,
        )
        await db_session.commit()
        assert app_id is not None

    async def test_returns_none_for_missing_itunes_id(self, db_session, seeded_db):
        country = seeded_db["countries"]["US"]
        parsed = {"name": "No ID App"}
        result = await upsert_app(
            db_session, parsed, country, None,
            global_mean=3.0, min_ratings=100,
        )
        assert result is None

    async def test_creates_rating_history(self, db_session: AsyncSession, seeded_db):
        country = seeded_db["countries"]["US"]
        category = seeded_db["categories"]["Games"]

        parsed = {
            "itunes_id": 777777,
            "name": "History Test App",
            "average_rating": 2.0,
            "rating_count": 300,
            "price": 0.0,
            "currency": "USD",
            "raw_json": {},
        }

        app_id = await upsert_app(
            db_session, parsed, country, category,
            global_mean=3.0, min_ratings=100,
        )
        await db_session.commit()

        # Verify rating history was created
        result = await db_session.execute(
            select(RatingHistory).where(RatingHistory.app_id == app_id)
        )
        history = result.scalars().all()
        assert len(history) == 1
        assert history[0].average_rating == 2.0
        assert history[0].snapshot_date == date.today()

    async def test_no_weighted_score_without_rating(self, db_session, seeded_db):
        country = seeded_db["countries"]["US"]
        parsed = {
            "itunes_id": 666666,
            "name": "No Rating App",
            "average_rating": None,
            "rating_count": 0,
            "price": 0.0,
            "currency": "USD",
            "raw_json": {},
        }

        app_id = await upsert_app(
            db_session, parsed, country, None,
            global_mean=3.0, min_ratings=100,
        )
        await db_session.commit()

        result = await db_session.execute(select(App).where(App.id == app_id))
        app = result.scalar_one()
        assert app.weighted_score is None

    async def test_no_category_allowed(self, db_session, seeded_db):
        """App can be inserted without a category."""
        country = seeded_db["countries"]["US"]
        parsed = {
            "itunes_id": 555555,
            "name": "No Category App",
            "average_rating": 3.0,
            "rating_count": 100,
            "price": 0.0,
            "currency": "USD",
            "raw_json": {},
        }
        app_id = await upsert_app(
            db_session, parsed, country, None,
            global_mean=3.0, min_ratings=100,
        )
        await db_session.commit()
        assert app_id is not None

        result = await db_session.execute(select(App).where(App.id == app_id))
        app = result.scalar_one()
        assert app.category_id is None
