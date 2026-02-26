"""Add keyword metrics table and cached fields

Revision ID: 009
Revises: 008
Create Date: 2026-02-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add cached metrics fields to user_keywords table
    op.add_column(
        'user_keywords',
        sa.Column('latest_popularity', sa.Float(), nullable=True)
    )
    op.add_column(
        'user_keywords',
        sa.Column('latest_difficulty', sa.Float(), nullable=True)
    )
    op.add_column(
        'user_keywords',
        sa.Column('latest_opportunity', sa.Float(), nullable=True)
    )

    # Create keyword_metrics table
    op.create_table(
        'keyword_metrics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('keyword_id', sa.Integer(), sa.ForeignKey('user_keywords.id', ondelete='CASCADE'), nullable=False),
        sa.Column('popularity_score', sa.Float(), nullable=False),
        sa.Column('difficulty_score', sa.Float(), nullable=False),
        sa.Column('opportunity_score', sa.Float(), nullable=False),
        sa.Column('total_results', sa.Integer(), nullable=False),
        sa.Column('hint_available', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('avg_top_10_rating_count', sa.Float(), nullable=True),
        sa.Column('avg_top_10_rating', sa.Float(), nullable=True),
        sa.Column('top_10_weighted_score_sum', sa.Float(), nullable=True),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('raw_data', JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add index for keyword_id + snapshot_date lookups
    op.create_index(
        'ix_keyword_metrics_keyword_date',
        'keyword_metrics',
        ['keyword_id', 'snapshot_date']
    )


def downgrade() -> None:
    op.drop_index('ix_keyword_metrics_keyword_date', 'keyword_metrics')
    op.drop_table('keyword_metrics')
    op.drop_column('user_keywords', 'latest_opportunity')
    op.drop_column('user_keywords', 'latest_difficulty')
    op.drop_column('user_keywords', 'latest_popularity')
