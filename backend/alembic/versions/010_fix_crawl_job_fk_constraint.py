"""Fix crawl_job_id foreign key constraint to SET NULL on delete

Revision ID: 010
Revises: 009
Create Date: 2026-02-26

"""
from typing import Sequence, Union
from alembic import op

revision: str = '010'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the existing FK constraint
    op.drop_constraint(
        'keyword_app_results_crawl_job_id_fkey',
        'keyword_app_results',
        type_='foreignkey'
    )
    # Recreate with ON DELETE SET NULL
    op.create_foreign_key(
        'keyword_app_results_crawl_job_id_fkey',
        'keyword_app_results',
        'crawl_jobs',
        ['crawl_job_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint(
        'keyword_app_results_crawl_job_id_fkey',
        'keyword_app_results',
        type_='foreignkey'
    )
    op.create_foreign_key(
        'keyword_app_results_crawl_job_id_fkey',
        'keyword_app_results',
        'crawl_jobs',
        ['crawl_job_id'],
        ['id']
    )
