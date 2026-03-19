import json
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.workspace import RunContext
from app.models.experiment import ExperimentStatus, VALID_EXPERIMENT_TRANSITIONS
from app.services.experiment_service import require_experiment_with_access
from app.models.run import Run
from app.repositories import run_config_repository, run_repository


def require_run_with_access(
    db: Session,
    run_id: str,
    token: str
) -> Run:

    run = run_repository.get_run_by_id(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    require_experiment_with_access(db, run.run_config.experiment_id, token)

    return run

def get_datasets_for_experiment(
    db,
    experiment_id
) -> list[str]:

    dataset_ids = run_config_repository.get_dataset_ids_by_experiment(db, experiment_id)
    if not dataset_ids:
        raise HTTPException(status_code=404, detail=f"No datasets found for experiment {experiment_id}")

    return dataset_ids


# def get_experiment_runs(
#     db,
#     experiment_id
# ) -> list[str]:

def get_runs_for_experiment_and_dataset(
    db,
    experiment_id,
    dataset_id
) -> list[Run]:

    runs = run_repository.get_runs_by_experiment_and_dataset(db, experiment_id, dataset_id)
    if not runs:
        raise HTTPException(status_code=404, detail=f"No runs found for experiment {experiment_id} and dataset {dataset_id}")

    return runs


def build_run_context(
    db: Session,
    run: Run
) -> RunContext:

    # Get experiment through run_config relationship
    run_config = run.run_config
    experiment = run_config.experiment

    context = RunContext.create(
        experiment_id=experiment.id,
        run_id=run.id,
        dataset_id=run_config.dataset_id,
        tool_name=experiment.tool_name,
        params=run_config.params_json,
        seed=run.seed
    )
    return context


def get_prediction_json(
    db: Session,
    run_id: str,
    token: str
) -> dict:

    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)

    check_run_finished(run)

    predictions = load_prediction_file(run_context)

    return predictions


def get_metrics_json(
    db: Session,
    run_id: str,
    token: str
) -> dict:

    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)

    check_run_finished(run)

    metrics = load_metrics_file(run_context)

    return metrics


def mark_running(
        db: Session,
        run: Run
) -> Run:
    return _update_run_status(
        db,
        run,
        ExperimentStatus.RUNNING,
        started_at=datetime.now(timezone.utc)
    )


def mark_finished(
        db: Session,
        run: Run
) -> Run:
    return _update_run_status(
        db,
        run,
        ExperimentStatus.FINISHED,
        finished_at=datetime.now(timezone.utc)
    )


def mark_failed(
        db: Session,
        run: Run
) -> Run:
    return _update_run_status(
        db,
        run,
        ExperimentStatus.FAILED,
        finished_at=datetime.now(timezone.utc)
    )


def _update_run_status(
    db: Session,
    run: Run,
    status: ExperimentStatus,
    started_at: Optional[datetime] = None,
    finished_at: Optional[datetime] = None
) -> Run:
    if run.status != status:
        if status not in VALID_EXPERIMENT_TRANSITIONS[run.status]:
            raise ValueError(f"Invalid status transition from {run.status} to {status}")

    return run_repository.update_status(
        db,
        run,
        status,
        started_at=started_at,
        finished_at=finished_at
    )


def check_run_finished(
    run: Run
) -> None:
    if run.status != ExperimentStatus.FINISHED:
        raise HTTPException(
            status_code=422,
            detail=f"Execution is {run.status.value}, not finished"
        )


def load_metrics_file(
    run_context: RunContext
) -> dict:

    metrics_path = run_context.metrics_file

    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Metrics not ready")

    return json.loads(metrics_path.read_text())


def load_prediction_file(
    run_context: RunContext
) -> dict:

    result_path = run_context.result_file

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")

    return json.loads(result_path.read_text())


def load_embeddings_file(
    run_context: RunContext
) -> pd.DataFrame:

    embeddings_path = run_context.embeddings_file
    if not embeddings_path.exists():
        raise HTTPException(status_code=404, detail="Embeddings file not found")


    embeddings_df = pd.read_csv(embeddings_path, index_col=0)

    return embeddings_df