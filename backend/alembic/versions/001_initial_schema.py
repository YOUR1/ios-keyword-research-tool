"""Initial schema

Revision ID: 001
Revises: None
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Countries
    op.create_table(
        "countries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(5), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("active", sa.Boolean(), default=True),
    )

    # Categories
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("itunes_id", sa.Integer(), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
    )

    # Apps
    op.create_table(
        "apps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("itunes_id", sa.Integer(), nullable=False, index=True),
        sa.Column("bundle_id", sa.String(500), nullable=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("developer", sa.String(500), nullable=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("country_id", sa.Integer(), sa.ForeignKey("countries.id"), nullable=False),
        sa.Column("average_rating", sa.Float(), nullable=True),
        sa.Column("rating_count", sa.Integer(), default=0),
        sa.Column("weighted_score", sa.Float(), nullable=True),
        sa.Column("current_version", sa.String(100), nullable=True),
        sa.Column("price", sa.Float(), default=0.0),
        sa.Column("currency", sa.String(10), default="USD"),
        sa.Column("icon_url", sa.String(1000), nullable=True),
        sa.Column("store_url", sa.String(1000), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("content_rating", sa.String(50), nullable=True),
        sa.Column("release_date", sa.Date(), nullable=True),
        sa.Column("updated_date", sa.DateTime(), nullable=True),
        sa.Column("raw_json", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("itunes_id", "country_id", name="uq_app_country"),
    )
    op.create_index("ix_apps_weighted_score", "apps", ["weighted_score"])
    op.create_index("ix_apps_rating_count", "apps", ["rating_count"])
    op.create_index("ix_apps_category", "apps", ["category_id"])
    op.create_index("ix_apps_country", "apps", ["country_id"])

    # Ratings History
    op.create_table(
        "ratings_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("app_id", sa.Integer(), sa.ForeignKey("apps.id"), nullable=False),
        sa.Column("average_rating", sa.Float(), nullable=True),
        sa.Column("rating_count", sa.Integer(), default=0),
        sa.Column("weighted_score", sa.Float(), nullable=True),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_rating_history_app_date", "ratings_history", ["app_id", "snapshot_date"])

    # Crawl Logs
    op.create_table(
        "crawl_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(50), default="itunes", nullable=False),
        sa.Column("country_code", sa.String(5), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("search_term", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), default="pending", nullable=False),
        sa.Column("apps_found", sa.Integer(), default=0),
        sa.Column("apps_updated", sa.Integer(), default=0),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("raw_response", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("crawl_logs")
    op.drop_table("ratings_history")
    op.drop_table("apps")
    op.drop_table("categories")
    op.drop_table("countries")
