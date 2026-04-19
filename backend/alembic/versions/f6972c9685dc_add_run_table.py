"""add_run_table

Revision ID: f6972c9685dc
Revises: 39683811261b
Create Date: 2026-03-05 07:49:12.980421

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f6972c9685dc'
down_revision: Union[str, Sequence[str], None] = '39683811261b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create runs table without recreating the enum type
    op.execute("""
        CREATE TABLE runs (
            id VARCHAR NOT NULL,
            experiment_id VARCHAR NOT NULL,
            dataset_id VARCHAR NOT NULL,
            seed INTEGER NOT NULL,
            status experimentstatus NOT NULL,
            output_path VARCHAR NOT NULL,
            metrics_json JSON,
            started_at TIMESTAMP WITH TIME ZONE,
            finished_at TIMESTAMP WITH TIME ZONE,
            PRIMARY KEY (id),
            FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id),
            FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('runs')
