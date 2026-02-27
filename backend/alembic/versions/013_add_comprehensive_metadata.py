"""Add comprehensive app metadata columns

Revision ID: 013
Revises: 012
Create Date: 2026-02-27

Adds columns for:
- iTunes API fields not currently extracted (genres, languages, release_notes, etc.)
- App Store scraped fields (subtitle, promotional_text, privacy_info, in_app_purchases)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # iTunes API fields (not currently extracted from raw_json)
    op.add_column("apps", sa.Column("genres", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("genre_ids", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("release_notes", sa.Text(), nullable=True))
    op.add_column("apps", sa.Column("file_size_bytes", sa.BigInteger(), nullable=True))
    op.add_column("apps", sa.Column("seller_name", sa.String(500), nullable=True))
    op.add_column("apps", sa.Column("seller_url", sa.String(1000), nullable=True))
    op.add_column("apps", sa.Column("minimum_os_version", sa.String(20), nullable=True))
    op.add_column("apps", sa.Column("languages", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("advisories", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("features", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("screenshot_urls", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("ipad_screenshot_urls", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("supported_devices", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("artist_id", sa.BigInteger(), nullable=True))
    op.add_column("apps", sa.Column("artist_view_url", sa.String(1000), nullable=True))
    op.add_column("apps", sa.Column("is_game_center_enabled", sa.Boolean(), nullable=True))
    op.add_column("apps", sa.Column("formatted_price", sa.String(50), nullable=True))

    # App Store scraped fields (NOT in iTunes API)
    op.add_column("apps", sa.Column("subtitle", sa.String(50), nullable=True))
    op.add_column("apps", sa.Column("promotional_text", sa.String(200), nullable=True))
    op.add_column("apps", sa.Column("privacy_info", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("in_app_purchases", JSONB(), nullable=True))
    op.add_column("apps", sa.Column("last_scraped_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("apps", sa.Column("scrape_status", sa.String(20), nullable=True))


def downgrade() -> None:
    # Remove scraped fields
    op.drop_column("apps", "scrape_status")
    op.drop_column("apps", "last_scraped_at")
    op.drop_column("apps", "in_app_purchases")
    op.drop_column("apps", "privacy_info")
    op.drop_column("apps", "promotional_text")
    op.drop_column("apps", "subtitle")

    # Remove iTunes API fields
    op.drop_column("apps", "formatted_price")
    op.drop_column("apps", "is_game_center_enabled")
    op.drop_column("apps", "artist_view_url")
    op.drop_column("apps", "artist_id")
    op.drop_column("apps", "supported_devices")
    op.drop_column("apps", "ipad_screenshot_urls")
    op.drop_column("apps", "screenshot_urls")
    op.drop_column("apps", "features")
    op.drop_column("apps", "advisories")
    op.drop_column("apps", "languages")
    op.drop_column("apps", "minimum_os_version")
    op.drop_column("apps", "seller_url")
    op.drop_column("apps", "seller_name")
    op.drop_column("apps", "file_size_bytes")
    op.drop_column("apps", "release_notes")
    op.drop_column("apps", "genre_ids")
    op.drop_column("apps", "genres")
