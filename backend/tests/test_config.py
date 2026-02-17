"""
Tests for app.core.config — Settings parsing and properties.
"""

import pytest
from app.core.config import Settings


class TestSettings:
    def test_default_values(self):
        s = Settings()
        assert s.APP_ENV == "development"
        assert s.APP_DEBUG is True
        assert s.POSTGRES_PORT == 5432
        assert s.WEIGHTED_SCORE_MIN_RATINGS == 100
        assert s.CRAWL_RATE_LIMIT_PER_MINUTE == 20
        assert s.RATE_LIMIT_PER_MINUTE == 60

    def test_database_url_property_from_components(self):
        s = Settings(
            POSTGRES_USER="u", POSTGRES_PASSWORD="p",
            POSTGRES_HOST="h", POSTGRES_PORT=5433, POSTGRES_DB="d",
            DATABASE_URL="",
        )
        assert s.database_url == "postgresql+asyncpg://u:p@h:5433/d"

    def test_database_url_property_explicit(self):
        s = Settings(DATABASE_URL="postgresql+asyncpg://custom:url@host/db")
        assert s.database_url == "postgresql+asyncpg://custom:url@host/db"

    def test_sync_database_url_property(self):
        s = Settings(
            POSTGRES_USER="u", POSTGRES_PASSWORD="p",
            POSTGRES_HOST="h", POSTGRES_PORT=5432, POSTGRES_DB="d",
        )
        assert s.sync_database_url == "postgresql://u:p@h:5432/d"

    def test_cors_origins_from_list(self):
        s = Settings(CORS_ORIGINS=["http://a.com", "http://b.com"])
        assert len(s.CORS_ORIGINS) == 2

    def test_cors_origins_from_json_string(self):
        s = Settings(CORS_ORIGINS='["http://a.com","http://b.com"]')
        assert s.CORS_ORIGINS == ["http://a.com", "http://b.com"]

    def test_api_prefix_default(self):
        s = Settings()
        assert s.API_V1_PREFIX == "/api/v1"
