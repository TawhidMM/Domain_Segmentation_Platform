"""experiment status trigger

Revision ID: 8419c786eef3
Revises: e71c8e6cec11
Create Date: 2026-07-14 02:57:08.632426

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8419c786eef3'
down_revision: Union[str, Sequence[str], None] = 'e71c8e6cec11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
       CREATE OR REPLACE FUNCTION recompute_experiment_status() RETURNS TRIGGER AS $$
            DECLARE
                v_experiment_id TEXT;
                v_completed INTEGER;
                v_running   INTEGER;
                v_queued    INTEGER;
                v_failed    INTEGER;
                v_new_status TEXT;
            BEGIN
                SELECT rc.experiment_id INTO v_experiment_id
                FROM run_configs rc
                WHERE rc.id = COALESCE(NEW.run_config_id, OLD.run_config_id);
            
                IF v_experiment_id IS NULL THEN
                    RETURN NEW;
                END IF;
            
                SELECT
                    COUNT(*) FILTER (WHERE r.status = 'FINISHED'),
                    COUNT(*) FILTER (WHERE r.status = 'RUNNING'),
                    COUNT(*) FILTER (WHERE r.status = 'QUEUED'),
                    COUNT(*) FILTER (WHERE r.status = 'FAILED')
                INTO v_completed, v_running, v_queued, v_failed
                FROM runs r
                JOIN run_configs rc ON rc.id = r.run_config_id
                WHERE rc.experiment_id = v_experiment_id;
            
                IF v_running > 0 THEN
                    v_new_status := 'RUNNING';
                ELSIF v_queued > 0 THEN
                    v_new_status := 'QUEUED';
                ELSE
                    v_new_status := 'FINISHED';
                END IF;
            
                UPDATE experiments
                SET completed_runs = v_completed,
                    status = v_new_status::experimentstatus,
                    finished_at = CASE
                        WHEN v_new_status IN ('FINISHED', 'failed') AND finished_at IS NULL
                        THEN now()
                        ELSE finished_at
                    END
                WHERE id = v_experiment_id;
            
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
       """)

    op.execute("""
           CREATE TRIGGER trg_recompute_experiment_status
               AFTER INSERT OR
           UPDATE OF status
           ON runs
               FOR EACH ROW
               EXECUTE FUNCTION recompute_experiment_status();
           """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS trg_recompute_experiment_status ON runs;")
    op.execute("DROP FUNCTION IF EXISTS recompute_experiment_status();")
