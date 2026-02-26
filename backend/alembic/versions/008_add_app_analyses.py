"""Add app_analyses table for AI-generated analysis storage

Revision ID: 008
Revises: 007_add_keyword_expansion
Create Date: 2026-02-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'app_analyses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('app_id', sa.Integer(), nullable=False),
        sa.Column('analysis', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('model_used', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id', name='uq_app_analyses_app_id')
    )
    op.create_index('ix_app_analyses_app_id', 'app_analyses', ['app_id'])


def downgrade() -> None:
    op.drop_index('ix_app_analyses_app_id', table_name='app_analyses')
    op.drop_table('app_analyses')
