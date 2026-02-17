from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import json


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_SECRET_KEY: str = "change-this"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "iosstore"
    POSTGRES_PASSWORD: str = "iosstore"
    POSTGRES_DB: str = "iosstore"
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Crawl settings
    CRAWL_RATE_LIMIT_PER_MINUTE: int = 20
    CRAWL_DEFAULT_COUNTRY: str = "US"
    CRAWL_MIN_RATING_THRESHOLD: int = 100
    CRAWL_BATCH_SIZE: int = 50

    # Weighted score
    WEIGHTED_SCORE_MIN_RATINGS: int = 100

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8282"]

    # JWT
    JWT_SECRET_KEY: str = "change-this-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Proxy
    PROXY_ENABLED: bool = False
    PROXY_PRIMARY_PROVIDER: str = "iproyal"
    IPROYAL_USER: str = ""
    IPROYAL_PASS: str = ""
    BRIGHTDATA_CUSTOMER_ID: str = ""
    BRIGHTDATA_ZONE: str = ""
    BRIGHTDATA_PASS: str = ""

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        """For Alembic and sync operations."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
