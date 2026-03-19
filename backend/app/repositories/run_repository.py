from typing import Optional, List

from sqlalchemy.orm import Session, joinedload

from app.models.run import Run
from app.models.run_config import RunConfig
from app.models.experiment import ExperimentStatus


def get_run_by_id(
    db: Session,
    run_id: str
) -> Optional[Run]:
    return (
        db.query(Run)
        .filter(Run.id == run_id)
        .options(joinedload(Run.run_config))
        .first()
    )


def get_runs_by_experiment(
    db: Session,
    experiment_id: str
) -> list[Run]:

    return (
        db.query(Run)
        .join(RunConfig, Run.run_config_id == RunConfig.id)
        .filter(RunConfig.experiment_id == experiment_id)
        .all()
    )


def get_runs_by_experiment_and_dataset(
    db: Session,
    experiment_id: str,
    dataset_id: str
) -> List[Run]:

    return (
        db.query(Run)
        .join(RunConfig, Run.run_config_id == RunConfig.id)
        .filter(
            RunConfig.experiment_id == experiment_id,
            RunConfig.dataset_id == dataset_id
        )
        .all()
    )


def create_run(
    db: Session,
    run: Run
) -> Run:
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def create_runs_batch(
    db: Session,
    runs: List[Run]
) -> List[Run]:
    db.add_all(runs)
    db.commit()
    for run in runs:
        db.refresh(run)
    return runs


def update_status(
    db: Session,
    run: Run,
    status: ExperimentStatus,
    started_at=None,
    finished_at=None
) -> Optional[Run]:

    run.status = status
    if started_at is not None:
        run.started_at = started_at
    if finished_at is not None:
        run.finished_at = finished_at

    db.commit()
    db.refresh(run)
    return run
