"""Make Youri an admin user.

Revision ID: 011
Revises: 010
Create Date: 2026-02-26

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE users SET role = 'admin' WHERE email = 'youri@vandenbogert.eu'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE users SET role = 'user' WHERE email = 'youri@vandenbogert.eu'"
    )
