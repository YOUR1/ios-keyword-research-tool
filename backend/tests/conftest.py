"""
Shared test fixtures.

Uses an async SQLite in-memory database so tests run without PostgreSQL.
Mocks Redis to avoid requiring a running Redis instance.
"""

import asyncio
from datetime import date, datetime
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, JSON
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base, get_db
from app.models.models import App, Category, Country, RatingHistory, CrawlLog, Review
from app.models.user import User, Plan, RefreshToken  # noqa: F401
from app.models.keyword import UserKeyword, CrawlJob, KeywordAppResult  # noqa: F401
from app.models.billing import UsageRecord  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401


# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture()
async def engine():
    """Create an async SQLite engine with in-memory database."""
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )

    # SQLite doesn't enforce FK constraints by default
    @event.listens_for(eng.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Remap PostgreSQL JSONB -> generic JSON for SQLite compatibility
    # This must happen before create_all
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, JSONB):
                column.type = JSON()

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield eng

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await eng.dispose()


@pytest.fixture()
async def db_session(engine) -> AsyncSession:
    """Provide a transactional database session for each test."""
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture()
async def seeded_db(db_session: AsyncSession):
    """
    Seed the test database with sample data.

    Creates:
      - 1 plan (free)
      - 2 countries (US, NL)
      - 2 categories (Games, Business)
      - 5 apps with varying ratings
      - Rating history for app 1
      - 1 crawl log
    """
    # Plans
    free_plan = Plan(id=1, name="free", max_keywords=5, max_crawls_per_day=2, max_results_stored=500, price_cents_monthly=0)
    starter_plan = Plan(id=2, name="starter", max_keywords=25, max_crawls_per_day=10, max_results_stored=5000, price_cents_monthly=999)
    db_session.add_all([free_plan, starter_plan])
    await db_session.flush()

    # Countries
    us = Country(id=1, code="US", name="United States", active=True)
    nl = Country(id=2, code="NL", name="Netherlands", active=True)
    db_session.add_all([us, nl])
    await db_session.flush()

    # Categories
    games = Category(id=1, itunes_id=6014, name="Games")
    business = Category(id=2, itunes_id=6000, name="Business")
    db_session.add_all([games, business])
    await db_session.flush()

    # Apps — deliberately varied for testing filters and sorting
    apps = [
        App(
            id=1, itunes_id=100001, name="Terrible Game",
            developer="Bad Dev", category_id=1, country_id=1,
            average_rating=1.2, rating_count=5000, weighted_score=1.25,
            price=0.0, currency="USD", current_version="1.0",
            icon_url="https://example.com/icon1.png",
            store_url="https://apps.apple.com/us/app/id100001",
        ),
        App(
            id=2, itunes_id=100002, name="Awful Business App",
            developer="Corp Inc", category_id=2, country_id=1,
            average_rating=1.5, rating_count=200, weighted_score=1.90,
            price=9.99, currency="USD", current_version="2.3",
        ),
        App(
            id=3, itunes_id=100003, name="Mediocre Game",
            developer="OK Studio", category_id=1, country_id=1,
            average_rating=3.0, rating_count=10000, weighted_score=3.0,
            price=0.0, currency="USD",
        ),
        App(
            id=4, itunes_id=100004, name="Dutch App",
            developer="NL Dev", category_id=2, country_id=2,
            average_rating=2.0, rating_count=300, weighted_score=2.50,
            price=1.99, currency="EUR",
        ),
        App(
            id=5, itunes_id=100005, name="Unrated App",
            developer="Ghost Dev", category_id=1, country_id=1,
            average_rating=None, rating_count=0, weighted_score=None,
            price=0.0, currency="USD",
        ),
    ]
    db_session.add_all(apps)
    await db_session.flush()

    # Rating history for app 1
    for i in range(5):
        rh = RatingHistory(
            app_id=1,
            average_rating=1.2 + (i * 0.05),
            rating_count=5000 + (i * 100),
            weighted_score=1.25 + (i * 0.04),
            snapshot_date=date(2026, 2, 10 + i),
        )
        db_session.add(rh)

    # Reviews for app 1
    review1 = Review(
        id=1, app_id=1, author_name="Angry User",
        author_url="https://itunes.apple.com/author/user1",
        rating=1, title="Terrible", body="This app is awful",
        review_date=datetime(2026, 2, 10), language="en",
    )
    review2 = Review(
        id=2, app_id=1, author_name="Sad User",
        author_url="https://itunes.apple.com/author/user2",
        rating=2, title="Bad", body="Not great at all",
        review_date=datetime(2026, 2, 12), language="en",
    )
    review3 = Review(
        id=3, app_id=1, author_name="Dutch User",
        author_url="https://itunes.apple.com/author/user3",
        rating=1, title="Slecht", body="Verschrikkelijke app",
        review_date=datetime(2026, 2, 14), language="nl",
    )
    # Review for app 2
    review4 = Review(
        id=4, app_id=2, author_name="Meh User",
        author_url="https://itunes.apple.com/author/user4",
        rating=3, title="Average", body="It's okay I guess",
        review_date=datetime(2026, 2, 11), language="en",
    )
    db_session.add_all([review1, review2, review3, review4])

    # Set rating distributions on apps
    apps[0].rating_distribution = {"1": 2, "2": 1, "3": 0, "4": 0, "5": 0}
    apps[1].rating_distribution = {"1": 0, "2": 0, "3": 1, "4": 0, "5": 0}

    # Crawl log
    log = CrawlLog(
        id=1, source="itunes", country_code="US",
        status="completed", apps_found=5, apps_updated=5,
        duration_seconds=12.5,
    )
    db_session.add(log)

    await db_session.commit()

    return {
        "countries": {"US": us, "NL": nl},
        "categories": {"Games": games, "Business": business},
        "apps": {a.name: a for a in apps},
        "reviews": [review1, review2, review3, review4],
    }


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_redis():
    """Return an AsyncMock that behaves like a Redis client returning None (cache miss)."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    return mock


@pytest.fixture()
async def client(db_session: AsyncSession, mock_redis):
    """
    Create an httpx AsyncClient wired to the FastAPI app
    with test DB session and mocked Redis.
    """
    from app.main import app

    async def _override_get_db():
        yield db_session

    async def _override_get_redis():
        return mock_redis

    app.dependency_overrides[get_db] = _override_get_db

    with patch("app.api.v1.apps.get_redis", _override_get_redis), \
         patch("app.api.v1.reviews.get_redis", _override_get_redis):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
async def seeded_client(db_session: AsyncSession, seeded_db, mock_redis):
    """Test client with pre-seeded data."""
    from app.main import app

    async def _override_get_db():
        yield db_session

    async def _override_get_redis():
        return mock_redis

    app.dependency_overrides[get_db] = _override_get_db

    with patch("app.api.v1.apps.get_redis", _override_get_redis), \
         patch("app.api.v1.reviews.get_redis", _override_get_redis):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Auth fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
async def auth_client(db_session: AsyncSession, seeded_db, mock_redis):
    """Test client with auth support + seeded plans."""
    from app.main import app

    async def _override_get_db():
        yield db_session

    async def _override_get_redis():
        return mock_redis

    app.dependency_overrides[get_db] = _override_get_db

    with patch("app.api.v1.apps.get_redis", _override_get_redis), \
         patch("app.api.v1.reviews.get_redis", _override_get_redis):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()


async def create_test_user(client: AsyncClient, email="test@example.com", password="testpass123", full_name="Test User"):
    """Helper: register a user and return tokens."""
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password,
    })
    return resp.json()


def auth_headers(access_token: str) -> dict:
    """Helper: build auth headers."""
    return {"Authorization": f"Bearer {access_token}"}
