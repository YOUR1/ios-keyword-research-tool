"""Add keyword expansion fields

Revision ID: 007
Revises: 006
Create Date: 2026-02-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add expansion_enabled flag (default True for new keywords)
    op.add_column(
        'user_keywords',
        sa.Column('expansion_enabled', sa.Boolean(), nullable=False, server_default='true')
    )
    # Add sub_keywords JSONB column to store expanded keyword list
    op.add_column(
        'user_keywords',
        sa.Column('sub_keywords', JSONB(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('user_keywords', 'sub_keywords')
    op.drop_column('user_keywords', 'expansion_enabled')
