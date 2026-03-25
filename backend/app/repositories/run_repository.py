from typing import Optional, List, cast

from sqlalchemy.orm import Session, joinedload

from app.models.run import Run
from app.models.run_config import RunConfig
from app.models.experiment import ExperimentStatus


def _run_loader_options(include_experiment: bool = False):
    if include_experiment:
        return joinedload(Run.run_config).joinedload(RunConfig.experiment)
    return joinedload(Run.run_config)


def get_run_by_id(
    db: Session,
    run_id: str,
    include_experiment: bool = False,
) -> Optional[Run]:
    return (
        db.query(Run)
        .filter(Run.id == run_id)
        .options(_run_loader_options(include_experiment))
        .first()
    )


def get_runs_by_experiment(
    db: Session,
    experiment_id: str,
    include_experiment: bool = False,
) -> list[Run]:

    rows = (
        db.query(Run)
        .options(_run_loader_options(include_experiment))
        .join(RunConfig, Run.run_config_id == RunConfig.id)
        .filter(RunConfig.experiment_id == experiment_id)
        .all()
    )

    return cast(List[Run], rows)


def get_runs_by_experiment_and_dataset(
    db: Session,
    experiment_id: str,
    dataset_id: str,
    include_experiment: bool = False,
) -> List[Run]:

    rows = (
        db.query(Run)
        .options(_run_loader_options(include_experiment))
        .join(RunConfig, Run.run_config_id == RunConfig.id)
        .filter(
            RunConfig.experiment_id == experiment_id,
            RunConfig.dataset_id == dataset_id
        )
        .all()
    )

    return cast(List[Run], rows)


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
