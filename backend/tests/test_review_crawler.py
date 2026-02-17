"""Tests for the Apple RSS review crawler service."""

import pytest
import respx
from httpx import Response

from app.models.models import App, Review
from app.services.reviews import ReviewCrawler
from sqlalchemy import select


# Sample RSS JSON feed response
SAMPLE_RSS_FEED = {
    "feed": {
        "entry": [
            {
                "author": {
                    "name": {"label": "TestUser1"},
                    "uri": {"label": "https://itunes.apple.com/author/testuser1"},
                },
                "im:rating": {"label": "1"},
                "title": {"label": "Terrible app"},
                "content": {
                    "label": "This is the worst app ever",
                    "attributes": {"type": "text"},
                },
                "updated": {"label": "2026-02-10T12:00:00Z"},
            },
            {
                "author": {
                    "name": {"label": "TestUser2"},
                    "uri": {"label": "https://itunes.apple.com/author/testuser2"},
                },
                "im:rating": {"label": "2"},
                "title": {"label": "Not great"},
                "content": {
                    "label": "Could be better",
                    "attributes": {"type": "text"},
                },
                "updated": {"label": "2026-02-11T08:30:00Z"},
            },
        ]
    }
}

# Single entry feed (dict, not list)
SINGLE_ENTRY_RSS_FEED = {
    "feed": {
        "entry": {
            "author": {
                "name": {"label": "OnlyUser"},
                "uri": {"label": "https://itunes.apple.com/author/onlyuser"},
            },
            "im:rating": {"label": "3"},
            "title": {"label": "It's okay"},
            "content": {
                "label": "Average experience",
                "attributes": {"type": "text"},
            },
            "updated": {"label": "2026-02-12T10:00:00Z"},
        }
    }
}

EMPTY_RSS_FEED = {"feed": {}}


class TestFetchReviews:
    """Tests for ReviewCrawler.fetch_reviews()."""

    @respx.mock
    async def test_fetch_reviews_success(self):
        """Mock RSS JSON response, verify parsed fields."""
        url = "https://itunes.apple.com/us/rss/customerreviews/id=100001/sortBy=mostRecent/json"
        respx.get(url).mock(return_value=Response(200, json=SAMPLE_RSS_FEED))

        crawler = ReviewCrawler()
        reviews = await crawler.fetch_reviews(100001, "US")
        await crawler.close()

        assert len(reviews) == 2
        assert reviews[0]["author_name"] == "TestUser1"
        assert reviews[0]["author_url"] == "https://itunes.apple.com/author/testuser1"
        assert reviews[0]["rating"] == 1
        assert reviews[0]["title"] == "Terrible app"
        assert reviews[0]["body"] == "This is the worst app ever"
        assert reviews[0]["review_date"] is not None

    @respx.mock
    async def test_fetch_reviews_empty_feed(self):
        """Mock empty/missing feed, returns empty list."""
        url = "https://itunes.apple.com/us/rss/customerreviews/id=100001/sortBy=mostRecent/json"
        respx.get(url).mock(return_value=Response(200, json=EMPTY_RSS_FEED))

        crawler = ReviewCrawler()
        reviews = await crawler.fetch_reviews(100001, "US")
        await crawler.close()

        assert reviews == []

    @respx.mock
    async def test_fetch_reviews_single_entry(self):
        """Mock feed with single entry (dict not list), verify correct handling."""
        url = "https://itunes.apple.com/us/rss/customerreviews/id=100001/sortBy=mostRecent/json"
        respx.get(url).mock(return_value=Response(200, json=SINGLE_ENTRY_RSS_FEED))

        crawler = ReviewCrawler()
        reviews = await crawler.fetch_reviews(100001, "US")
        await crawler.close()

        assert len(reviews) == 1
        assert reviews[0]["author_name"] == "OnlyUser"
        assert reviews[0]["rating"] == 3

    @respx.mock
    async def test_fetch_reviews_http_error(self):
        """HTTP error returns empty list without raising."""
        url = "https://itunes.apple.com/us/rss/customerreviews/id=100001/sortBy=mostRecent/json"
        respx.get(url).mock(return_value=Response(404))

        crawler = ReviewCrawler()
        reviews = await crawler.fetch_reviews(100001, "US")
        await crawler.close()

        assert reviews == []


class TestUpsertReviews:
    """Tests for ReviewCrawler.upsert_reviews()."""

    async def test_upsert_reviews_new(self, db_session, seeded_db):
        """Insert new reviews, verify count."""
        crawler = ReviewCrawler()
        reviews = [
            {
                "author_name": "NewUser",
                "author_url": "https://itunes.apple.com/author/newuser",
                "rating": 1,
                "title": "New Review",
                "body": "Just awful",
                "review_date": None,
                "language": "en",
                "raw_json": None,
            }
        ]

        count = await crawler.upsert_reviews(db_session, 1, reviews)
        await db_session.commit()

        assert count == 1

        result = await db_session.execute(
            select(Review).where(Review.author_url == "https://itunes.apple.com/author/newuser")
        )
        review = result.scalar_one()
        assert review.author_name == "NewUser"
        assert review.rating == 1

    async def test_upsert_reviews_conflict(self, db_session, seeded_db):
        """Insert duplicate author_url, verify upsert handles it (update or ignore).

        Note: pg_insert ON CONFLICT DO UPDATE uses named constraints which SQLite
        handles differently. In SQLite, ON CONFLICT may not update all fields.
        This test verifies the upsert completes without error and doesn't
        create duplicates. Full update behavior is verified in PostgreSQL.
        """
        crawler = ReviewCrawler()
        # Use existing author_url from seeded data
        reviews = [
            {
                "author_name": "Angry User Updated",
                "author_url": "https://itunes.apple.com/author/user1",
                "rating": 2,
                "title": "Updated Title",
                "body": "Changed my mind slightly",
                "review_date": None,
                "language": "en",
                "raw_json": None,
            }
        ]

        count = await crawler.upsert_reviews(db_session, 1, reviews)
        await db_session.commit()

        assert count == 1

        # Verify no duplicate was created
        result = await db_session.execute(
            select(Review).where(Review.author_url == "https://itunes.apple.com/author/user1")
        )
        all_reviews = result.scalars().all()
        assert len(all_reviews) == 1

    async def test_upsert_reviews_empty(self, db_session, seeded_db):
        """Empty review list returns 0."""
        crawler = ReviewCrawler()
        count = await crawler.upsert_reviews(db_session, 1, [])
        assert count == 0


class TestUpdateRatingDistribution:
    """Tests for ReviewCrawler.update_rating_distribution()."""

    async def test_update_rating_distribution(self, db_session, seeded_db):
        """Verify JSONB written correctly to App."""
        crawler = ReviewCrawler()
        await crawler.update_rating_distribution(db_session, 1)
        await db_session.commit()

        result = await db_session.execute(select(App).where(App.id == 1))
        app = result.scalar_one()
        dist = app.rating_distribution
        assert dist is not None
        assert dist["1"] == 2  # Two 1-star reviews
        assert dist["2"] == 1  # One 2-star review
        assert dist["3"] == 0
        assert dist["4"] == 0
        assert dist["5"] == 0
