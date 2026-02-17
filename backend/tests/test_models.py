"""
Tests for app.models.models — SQLAlchemy ORM models.

Tests model creation, relationships, defaults, and constraints
using the in-memory SQLite test database.
"""

import pytest
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import App, Category, Country, RatingHistory, CrawlLog


class TestCountryModel:
    async def test_create_country(self, db_session: AsyncSession):
        country = Country(code="US", name="United States", active=True)
        db_session.add(country)
        await db_session.flush()

        assert country.id is not None
        assert country.code == "US"
        assert country.active is True

    async def test_country_unique_code(self, db_session: AsyncSession):
        c1 = Country(code="GB", name="United Kingdom")
        c2 = Country(code="GB", name="Great Britain")
        db_session.add(c1)
        await db_session.flush()
        db_session.add(c2)
        with pytest.raises(Exception):  # IntegrityError
            await db_session.flush()

    async def test_country_query(self, db_session: AsyncSession):
        db_session.add(Country(code="FR", name="France"))
        await db_session.flush()
        result = await db_session.execute(
            select(Country).where(Country.code == "FR")
        )
        c = result.scalar_one()
        assert c.name == "France"


class TestCategoryModel:
    async def test_create_category(self, db_session: AsyncSession):
        cat = Category(itunes_id=6014, name="Games")
        db_session.add(cat)
        await db_session.flush()
        assert cat.id is not None
        assert cat.itunes_id == 6014

    async def test_category_parent_child(self, db_session: AsyncSession):
        parent = Category(itunes_id=6014, name="Games")
        db_session.add(parent)
        await db_session.flush()

        child = Category(itunes_id=7001, name="Action", parent_id=parent.id)
        db_session.add(child)
        await db_session.flush()

        assert child.parent_id == parent.id

    async def test_category_unique_itunes_id(self, db_session: AsyncSession):
        c1 = Category(itunes_id=6000, name="Business")
        c2 = Category(itunes_id=6000, name="Business Copy")
        db_session.add(c1)
        await db_session.flush()
        db_session.add(c2)
        with pytest.raises(Exception):
            await db_session.flush()


class TestAppModel:
    async def test_create_app(self, db_session: AsyncSession):
        country = Country(code="US", name="United States")
        db_session.add(country)
        await db_session.flush()

        app = App(
            itunes_id=123456,
            name="Test App",
            developer="Test Dev",
            country_id=country.id,
            average_rating=2.5,
            rating_count=1000,
            weighted_score=2.6,
            price=0.0,
            currency="USD",
        )
        db_session.add(app)
        await db_session.flush()

        assert app.id is not None
        assert app.name == "Test App"

    async def test_app_nullable_fields(self, db_session: AsyncSession):
        country = Country(code="DE", name="Germany")
        db_session.add(country)
        await db_session.flush()

        app = App(
            itunes_id=999999,
            name="Bare Minimum App",
            country_id=country.id,
        )
        db_session.add(app)
        await db_session.flush()

        assert app.developer is None
        assert app.category_id is None
        assert app.average_rating is None
        assert app.weighted_score is None
        assert app.bundle_id is None
        assert app.description is None

    async def test_app_country_relationship(self, db_session: AsyncSession, seeded_db):
        result = await db_session.execute(
            select(App).where(App.name == "Terrible Game")
        )
        app = result.scalar_one()
        assert app.country_id == seeded_db["countries"]["US"].id

    async def test_app_category_relationship(self, db_session: AsyncSession, seeded_db):
        result = await db_session.execute(
            select(App).where(App.name == "Terrible Game")
        )
        app = result.scalar_one()
        assert app.category_id == seeded_db["categories"]["Games"].id

    async def test_app_defaults(self, db_session: AsyncSession):
        country = Country(code="JP", name="Japan")
        db_session.add(country)
        await db_session.flush()

        app = App(itunes_id=555555, name="Defaults App", country_id=country.id)
        db_session.add(app)
        await db_session.flush()

        assert app.rating_count == 0
        assert app.price == 0.0
        assert app.currency == "USD"


class TestRatingHistoryModel:
    async def test_create_rating_history(self, db_session: AsyncSession, seeded_db):
        rh = RatingHistory(
            app_id=1,
            average_rating=1.5,
            rating_count=5100,
            weighted_score=1.55,
            snapshot_date=date(2026, 2, 16),
        )
        db_session.add(rh)
        await db_session.flush()
        assert rh.id is not None

    async def test_query_history_for_app(self, db_session: AsyncSession, seeded_db):
        result = await db_session.execute(
            select(RatingHistory)
            .where(RatingHistory.app_id == 1)
            .order_by(RatingHistory.snapshot_date)
        )
        rows = result.scalars().all()
        assert len(rows) == 5  # Seeded 5 snapshots
        # Verify ordering
        dates = [r.snapshot_date for r in rows]
        assert dates == sorted(dates)

    async def test_rating_history_defaults(self, db_session: AsyncSession, seeded_db):
        rh = RatingHistory(
            app_id=1,
            snapshot_date=date(2026, 3, 1),
            rating_count=0,
        )
        db_session.add(rh)
        await db_session.flush()
        assert rh.average_rating is None
        assert rh.weighted_score is None


class TestCrawlLogModel:
    async def test_create_crawl_log(self, db_session: AsyncSession):
        log = CrawlLog(
            source="itunes",
            country_code="US",
            status="completed",
            apps_found=100,
            apps_updated=95,
            duration_seconds=30.5,
        )
        db_session.add(log)
        await db_session.flush()
        assert log.id is not None
        assert log.source == "itunes"

    async def test_crawl_log_defaults(self, db_session: AsyncSession):
        log = CrawlLog(
            source="itunes",
            country_code="US",
        )
        db_session.add(log)
        await db_session.flush()
        assert log.status == "pending"
        assert log.apps_found == 0
        assert log.apps_updated == 0
        assert log.error_message is None

    async def test_crawl_log_with_error(self, db_session: AsyncSession):
        log = CrawlLog(
            source="itunes",
            country_code="US",
            status="failed",
            error_message="Connection timeout",
        )
        db_session.add(log)
        await db_session.flush()
        assert log.status == "failed"
        assert log.error_message == "Connection timeout"
