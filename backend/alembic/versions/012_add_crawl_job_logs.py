"""Add crawl_job_logs table

Revision ID: 012
Revises: 011
Create Date: 2026-02-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "crawl_job_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("crawl_jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("level", sa.String(20), default="info"),
        sa.Column("phase", sa.String(20), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=True),
        sa.Column("extra_data", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_crawl_job_logs_job_id", "crawl_job_logs", ["job_id"])
    op.create_index("ix_crawl_job_logs_job_created", "crawl_job_logs", ["job_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_crawl_job_logs_job_created", table_name="crawl_job_logs")
    op.drop_index("ix_crawl_job_logs_job_id", table_name="crawl_job_logs")
    op.drop_table("crawl_job_logs")
