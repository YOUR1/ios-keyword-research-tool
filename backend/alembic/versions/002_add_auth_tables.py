"""Add auth tables: plans, users, refresh_tokens

Revision ID: 002
Revises: 001
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Plans
    op.create_table(
        "plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("max_keywords", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_crawls_per_day", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("max_results_stored", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("price_cents_monthly", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Seed default plans
    op.execute(
        "INSERT INTO plans (name, max_keywords, max_crawls_per_day, max_results_stored, price_cents_monthly) "
        "VALUES ('free', 5, 2, 500, 0), ('starter', 25, 10, 5000, 999), ('pro', 100, 50, 50000, 2999)"
    )

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(320), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(128), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("plans.id"), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("email_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Refresh tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_refresh_tokens_hash", "refresh_tokens", ["token_hash"])
    op.create_index("ix_refresh_tokens_user", "refresh_tokens", ["user_id"])

    # Add user_id and keyword_id to crawl_logs
    op.add_column("crawl_logs", sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("crawl_logs", "user_id")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_table("plans")
