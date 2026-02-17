"""Add reviews table and rating_distribution column on apps

Revision ID: 004
Revises: 003
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add rating_distribution JSONB column to apps
    op.add_column("apps", sa.Column("rating_distribution", JSONB(), nullable=True))

    # Create reviews table
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("app_id", sa.Integer(), sa.ForeignKey("apps.id"), nullable=False),
        sa.Column("author_name", sa.String(500), nullable=False),
        sa.Column("author_url", sa.String(1000), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(1000), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("review_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("raw_json", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("app_id", "author_url", name="uq_review_app_author"),
    )
    op.create_index("ix_reviews_app_date", "reviews", ["app_id", "review_date"])
    op.create_index("ix_reviews_app_rating", "reviews", ["app_id", "rating"])


def downgrade() -> None:
    op.drop_index("ix_reviews_app_rating", table_name="reviews")
    op.drop_index("ix_reviews_app_date", table_name="reviews")
    op.drop_table("reviews")
    op.drop_column("apps", "rating_distribution")
