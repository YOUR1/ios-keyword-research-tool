"""Add SaaS tables: user_keywords, crawl_jobs, keyword_app_results, usage_records, audit_logs

Revision ID: 003
Revises: 002
Create Date: 2026-02-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # User Keywords
    op.create_table(
        "user_keywords",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("term", sa.String(200), nullable=False),
        sa.Column("country_code", sa.String(5), nullable=False, server_default="US"),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("crawl_frequency", sa.String(20), nullable=False, server_default="daily"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("last_crawled_at", sa.DateTime(), nullable=True),
        sa.Column("next_run_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "term", "country_code", "category_id", name="uq_user_keyword"),
    )
    op.create_index("ix_user_keywords_next_run", "user_keywords", ["next_run_at"])

    # Crawl Jobs
    op.create_table(
        "crawl_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("keyword_id", sa.Integer(), sa.ForeignKey("user_keywords.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("apps_found", sa.Integer(), server_default="0"),
        sa.Column("apps_new", sa.Integer(), server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("proxy_used", sa.String(100), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_crawl_jobs_status", "crawl_jobs", ["status"])
    op.create_index("ix_crawl_jobs_user", "crawl_jobs", ["user_id"])

    # Keyword App Results
    op.create_table(
        "keyword_app_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("keyword_id", sa.Integer(), sa.ForeignKey("user_keywords.id", ondelete="CASCADE"), nullable=False),
        sa.Column("app_id", sa.Integer(), sa.ForeignKey("apps.id", ondelete="CASCADE"), nullable=False),
        sa.Column("crawl_job_id", sa.Integer(), sa.ForeignKey("crawl_jobs.id"), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("keyword_id", "app_id", name="uq_keyword_app"),
    )

    # Usage Records
    op.create_table(
        "usage_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("usage_type", sa.String(30), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1"),
        sa.Column("recorded_date", sa.Date(), server_default=sa.func.current_date()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Audit Logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("metadata_json", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Add keyword_id to crawl_logs for linking system crawls to keywords
    op.add_column("crawl_logs", sa.Column("keyword_id", sa.Integer(), sa.ForeignKey("user_keywords.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("crawl_logs", "keyword_id")
    op.drop_table("audit_logs")
    op.drop_table("usage_records")
    op.drop_table("keyword_app_results")
    op.drop_table("crawl_jobs")
    op.drop_table("user_keywords")
