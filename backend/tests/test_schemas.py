"""
Tests for app.schemas.schemas — Pydantic model validation.
"""

import pytest
from datetime import date, datetime
from pydantic import ValidationError

from app.schemas.schemas import (
    CountryOut,
    CategoryOut,
    AppListItem,
    AppDetail,
    RatingHistoryItem,
    PaginatedApps,
    CrawlStatus,
    IndexStats,
)


class TestCountryOut:
    def test_valid(self):
        c = CountryOut(id=1, code="US", name="United States")
        assert c.code == "US"

    def test_missing_required_field(self):
        with pytest.raises(ValidationError):
            CountryOut(id=1, code="US")  # missing name


class TestCategoryOut:
    def test_valid_with_parent(self):
        c = CategoryOut(id=1, itunes_id=6014, name="Games", parent_id=None)
        assert c.parent_id is None

    def test_valid_without_parent(self):
        c = CategoryOut(id=2, itunes_id=6015, name="Finance")
        assert c.parent_id is None

    def test_with_parent_id(self):
        c = CategoryOut(id=3, itunes_id=7001, name="Action", parent_id=1)
        assert c.parent_id == 1


class TestAppListItem:
    def test_valid_complete(self):
        item = AppListItem(
            id=1, itunes_id=100001, name="Test App",
            developer="Dev", category_name="Games", country_code="US",
            average_rating=2.5, rating_count=1000, weighted_score=2.6,
            price=0.0, currency="USD", icon_url="https://x.com/icon.png",
            store_url="https://apps.apple.com/id1", current_version="1.0",
        )
        assert item.name == "Test App"

    def test_nullable_fields_default_to_none(self):
        item = AppListItem(
            id=1, itunes_id=100001, name="Test App",
            country_code="US", rating_count=0, price=0.0, currency="USD",
        )
        assert item.developer is None
        assert item.category_name is None
        assert item.average_rating is None
        assert item.weighted_score is None
        assert item.icon_url is None
        assert item.store_url is None
        assert item.current_version is None

    def test_rejects_missing_required_fields(self):
        with pytest.raises(ValidationError):
            AppListItem(id=1, itunes_id=100001)  # missing name, country_code, etc.


class TestAppDetail:
    def test_valid_complete(self):
        detail = AppDetail(
            id=1, itunes_id=100001, name="Test App",
            country=CountryOut(id=1, code="US", name="United States"),
            rating_count=500, price=0.0, currency="USD",
            created_at=datetime(2026, 1, 1),
            updated_at=datetime(2026, 2, 1),
        )
        assert detail.country.code == "US"
        assert detail.category is None

    def test_with_category(self):
        detail = AppDetail(
            id=1, itunes_id=100001, name="Test App",
            category=CategoryOut(id=1, itunes_id=6014, name="Games"),
            country=CountryOut(id=1, code="US", name="United States"),
            rating_count=500, price=0.0, currency="USD",
            created_at=datetime(2026, 1, 1),
            updated_at=datetime(2026, 2, 1),
        )
        assert detail.category.name == "Games"

    def test_all_optional_fields(self):
        detail = AppDetail(
            id=1, itunes_id=100001, name="X",
            country=CountryOut(id=1, code="US", name="US"),
            rating_count=0, price=0.0, currency="USD",
            created_at=datetime(2026, 1, 1),
            updated_at=datetime(2026, 1, 1),
        )
        assert detail.bundle_id is None
        assert detail.developer is None
        assert detail.average_rating is None
        assert detail.weighted_score is None
        assert detail.description is None
        assert detail.content_rating is None
        assert detail.release_date is None
        assert detail.updated_date is None


class TestRatingHistoryItem:
    def test_valid(self):
        item = RatingHistoryItem(
            snapshot_date=date(2026, 2, 15),
            average_rating=1.5,
            rating_count=100,
            weighted_score=1.8,
        )
        assert item.snapshot_date == date(2026, 2, 15)

    def test_nullable_ratings(self):
        item = RatingHistoryItem(
            snapshot_date=date(2026, 2, 15),
            rating_count=0,
        )
        assert item.average_rating is None
        assert item.weighted_score is None


class TestPaginatedApps:
    def test_empty_page(self):
        page = PaginatedApps(
            items=[], total=0, page=1, page_size=50, total_pages=0
        )
        assert page.items == []
        assert page.total_pages == 0

    def test_with_items(self):
        item = AppListItem(
            id=1, itunes_id=1, name="X", country_code="US",
            rating_count=0, price=0.0, currency="USD",
        )
        page = PaginatedApps(
            items=[item], total=1, page=1, page_size=50, total_pages=1,
        )
        assert len(page.items) == 1

    def test_rejects_negative_total(self):
        # Pydantic doesn't constrain int by default, but verify it constructs
        page = PaginatedApps(
            items=[], total=-1, page=1, page_size=50, total_pages=0
        )
        assert page.total == -1  # No constraint defined — just documenting behavior


class TestCrawlStatus:
    def test_valid(self):
        cs = CrawlStatus(
            id=1, source="itunes", country_code="US",
            status="completed", apps_found=50, apps_updated=45,
            duration_seconds=12.5,
            created_at=datetime(2026, 2, 15, 10, 0, 0),
        )
        assert cs.status == "completed"

    def test_nullable_duration(self):
        cs = CrawlStatus(
            id=1, source="itunes", country_code="US",
            status="pending", apps_found=0, apps_updated=0,
            created_at=datetime(2026, 2, 15),
        )
        assert cs.duration_seconds is None


class TestIndexStats:
    def test_valid_complete(self):
        stats = IndexStats(
            total_apps=1000,
            total_countries=5,
            total_categories=27,
            last_crawl=datetime(2026, 2, 15),
            global_mean_rating=3.2,
            min_rating_threshold=100,
        )
        assert stats.total_apps == 1000

    def test_nullable_fields(self):
        stats = IndexStats(
            total_apps=0,
            total_countries=0,
            total_categories=0,
            min_rating_threshold=100,
        )
        assert stats.last_crawl is None
        assert stats.global_mean_rating is None
