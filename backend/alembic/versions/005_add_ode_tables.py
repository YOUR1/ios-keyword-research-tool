"""Add ODE (Opportunity Discovery Engine) tables

Revision ID: 005
Revises: 004_add_reviews_table
Create Date: 2026-02-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create keywords table
    op.create_table(
        'keywords',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('keyword', sa.String(length=500), nullable=False),
        sa.Column('country_id', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('trend_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('frequency', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('discovery_date', sa.Date(), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('source_apps', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['country_id'], ['countries.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('keyword', 'country_id', name='uq_keyword_country')
    )
    op.create_index('ix_keywords_trend_score', 'keywords', ['trend_score'])
    op.create_index('ix_keywords_discovery_date', 'keywords', ['discovery_date'])

    # Create opportunity_scores table
    op.create_table(
        'opportunity_scores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('app_id', sa.Integer(), nullable=False),
        sa.Column('opportunity_score', sa.Float(), nullable=False),
        sa.Column('normalized_downloads', sa.Float(), nullable=True),
        sa.Column('rating_gap', sa.Float(), nullable=True),
        sa.Column('niche_rank', sa.Integer(), nullable=True),
        sa.Column('scan_date', sa.Date(), nullable=False),
        sa.Column('formula_version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id', 'scan_date', name='uq_opportunity_app_date')
    )
    op.create_index('ix_opportunity_score', 'opportunity_scores', ['opportunity_score'])
    op.create_index('ix_opportunity_scan_date', 'opportunity_scores', ['scan_date'])

    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='medium'),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('app_id', sa.Integer(), nullable=True),
        sa.Column('keyword_id', sa.Integer(), nullable=True),
        sa.Column('opportunity_score', sa.Float(), nullable=True),
        sa.Column('trigger_value', sa.Float(), nullable=True),
        sa.Column('threshold_value', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ),
        sa.ForeignKeyConstraint(['keyword_id'], ['keywords.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_alerts_type', 'alerts', ['alert_type'])
    op.create_index('ix_alerts_status', 'alerts', ['status'])
    op.create_index('ix_alerts_created', 'alerts', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_alerts_created', table_name='alerts')
    op.drop_index('ix_alerts_status', table_name='alerts')
    op.drop_index('ix_alerts_type', table_name='alerts')
    op.drop_table('alerts')

    op.drop_index('ix_opportunity_scan_date', table_name='opportunity_scores')
    op.drop_index('ix_opportunity_score', table_name='opportunity_scores')
    op.drop_table('opportunity_scores')

    op.drop_index('ix_keywords_discovery_date', table_name='keywords')
    op.drop_index('ix_keywords_trend_score', table_name='keywords')
    op.drop_table('keywords')
