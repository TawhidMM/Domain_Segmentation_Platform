import json
import re
import uuid
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

MAX_LOG_BYTES = 1024 * 1024
LOG_READ_CHUNK_SIZE = 64 * 1024
ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
SECRET_RE = re.compile(
    r"(?i)\b(password|passwd|secret|token|api[_-]?key|authorization)"
    r"(\s*[:=]\s*)([^\s,;]+)"
)
BEARER_RE = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+")


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


def get_runs_for_experiment(
    db,
    experiment_id,
    include_experiment: bool = False,
) -> list[Run]:

    runs = run_repository.get_runs_by_experiment(
        db,
        experiment_id,
        include_experiment=include_experiment,
    )
    if not runs:
        raise HTTPException(status_code=404,
                detail=f"No runs found for experiment {experiment_id}")

    return runs


def get_runs_for_experiment_and_dataset(
    db,
    experiment_id,
    dataset_id,
    include_experiment: bool = False,
) -> list[Run]:

    runs = run_repository.get_runs_by_experiment_and_dataset(
        db,
        experiment_id,
        dataset_id,
        include_experiment=include_experiment,
    )
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
        annotation_id=run_config.annotation_id,
        tool_id=experiment.tool_id,
        experiment_name=experiment.experiment_name,
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


def get_run_logs(
    db: Session,
    run_id: str,
    token: str,
    stream: str,
    lines: int,
) -> dict:
    try:
        uuid.UUID(run_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid run ID") from exc

    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)
    log_path = run_context.logs_dir / f"docker_{stream}.log"
    log_root = run_context.logs_dir.resolve()

    try:
        if log_path.resolve().parent != log_root:
            raise HTTPException(status_code=400, detail="Invalid log path")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Log file not found")

    if not log_path.exists():
        if run.status in (ExperimentStatus.QUEUED, ExperimentStatus.RUNNING):
            log_lines = []
        else:
            raise HTTPException(status_code=404, detail="Log file not found")
    else:
        log_lines = _read_last_log_lines(log_path, lines)

    return {
        "run_id": run.id,
        "status": run.status.value,
        "stream": stream,
        "lines": log_lines,
    }


def _read_last_log_lines(log_path, line_count: int) -> list[str]:
    buffer = bytearray()

    with log_path.open("rb") as log_file:
        log_file.seek(0, 2)
        position = log_file.tell()

        while position > 0 and buffer.count(b"\n") < line_count:
            read_size = min(LOG_READ_CHUNK_SIZE, position)
            position -= read_size
            log_file.seek(position)
            buffer[:0] = log_file.read(read_size)

            if len(buffer) > MAX_LOG_BYTES:
                del buffer[:-MAX_LOG_BYTES]
                break

    lines = bytes(buffer).splitlines()[-line_count:]
    return [_redact_log_line(ANSI_ESCAPE_RE.sub("", line.decode("utf-8", errors="replace"))) for line in lines]


def _redact_log_line(line: str) -> str:
    line = BEARER_RE.sub("Bearer [REDACTED]", line)
    return SECRET_RE.sub(r"\1\2[REDACTED]", line)


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
        ExperimentStatus.COMPLETED,
        finished_at=datetime.now(timezone.utc)
    )


def mark_failed(
    db: Session,
    run: Run,
    message: Optional[str] = None
) -> Run:
    return _update_run_status(
        db,
        run,
        ExperimentStatus.FAILED,
        finished_at=datetime.now(timezone.utc),
        error_message=message,
    )


def _update_run_status(
    db: Session,
    run: Run,
    status: ExperimentStatus,
    started_at: Optional[datetime] = None,
    finished_at: Optional[datetime] = None,
    error_message: Optional[str] = None
) -> Run:
    if run.status != status:
        if status not in VALID_EXPERIMENT_TRANSITIONS[run.status]:
            raise ValueError(f"Invalid status transition from {run.status} to {status}")

    return run_repository.update_status(
        db,
        run,
        status,
        started_at=started_at,
        finished_at=finished_at,
        error_message=error_message
    )


def check_run_finished(
    run: Run
) -> None:
    if run.status != ExperimentStatus.COMPLETED:
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