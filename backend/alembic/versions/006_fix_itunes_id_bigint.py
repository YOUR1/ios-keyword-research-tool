"""Fix itunes_id column to BIGINT

Revision ID: 006
Revises: 005
Create Date: 2026-02-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change itunes_id from INTEGER to BIGINT to support large iTunes IDs
    op.alter_column(
        'apps',
        'itunes_id',
        type_=sa.BigInteger(),
        existing_type=sa.Integer(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'apps',
        'itunes_id',
        type_=sa.Integer(),
        existing_type=sa.BigInteger(),
        existing_nullable=False,
    )
