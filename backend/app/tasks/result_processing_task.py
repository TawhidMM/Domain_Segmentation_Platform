import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from sqlalchemy.orm import Session

from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.core.storage_space import StagingSpace
from app.models.experiment import ExperimentStatus
from app.repositories import run_repository, experiment_repository
from app.services import run_service
from app.services.run_service import mark_finished, mark_running
from app.services.tool_executor import ToolExecutor



@celery_app.task(
    bind=True,
    autoretry_for=(OSError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    queue="io",
)
def process_imported_results(
    self,
    staging_data: list[Dict[str, str]]
) -> None:

    db = SessionLocal()

    try:
        for item in staging_data:
            run_id = item["run_id"]
            stage_id = item["stage_id"]

            run = run_repository.get_run_by_id(db, run_id)
            if run is None:
                return

            mark_running(db, run)

            staging_dir = StagingSpace(stage_id).staging_directory
            run_context = run_service.build_run_context(db, run)

            _move_file(staging_dir, run_context.output_dir, "predictions.csv")
            _move_file(staging_dir, run_context.output_dir, "embeddings.csv")

            tool_executor = ToolExecutor(run_context)
            tool_executor.posst_process_result()

            mark_finished(db, run)

            shutil.rmtree(staging_dir)

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _move_file(
    staging_dir: Path,
    output_dir: Path,
    filename: str
) -> None:

    staging_file = staging_dir / filename
    if not staging_file.exists():
        raise FileNotFoundError(f"Required file '{filename}' not found in staging area")

    output_dir.mkdir(parents=True, exist_ok=True)
    destination_file = output_dir / filename
    if destination_file.exists():
        destination_file.unlink()

    # staging_file.rename(destination_file)
    shutil.move(str(staging_file), str(destination_file))


def _mark_experiment_completed(
    db: Session,
    experiment_id: str
) -> None:

    experiment = experiment_repository.get_experiment_by_id(db, experiment_id)
    if experiment is None:
        raise RuntimeError(f"Experiment '{experiment_id}' not found during background processing")

    experiment.completed_runs = 1
    experiment.status = ExperimentStatus.COMPLETED
    experiment.finished_at = datetime.now(timezone.utc)
    db.commit()


def _mark_experiment_failed(
    db: Session,
    experiment_id: str
) -> None:

    experiment_db = experiment_repository.get_experiment_by_id(db, experiment_id)
    if experiment_db is not None:
        experiment_db.status = ExperimentStatus.FAILED
        experiment_db.finished_at = datetime.now(timezone.utc)
        db.commit()