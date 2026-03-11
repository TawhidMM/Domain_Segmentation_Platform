from typing import Optional, List

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.run import Run
from app.models.experiment import ExperimentStatus


def get_run_by_id(
    db: Session,
    run_id: str
) -> Optional[Run]:
    return db.query(Run).filter(Run.id == run_id).first()


def get_runs_by_experiment(
    db: Session,
    experiment_id: str
) -> list[type[Run]]:

    return db.query(Run).filter(Run.experiment_id == experiment_id).all()


def get_dataset_ids_by_experiment(
    db: Session,
    experiment_id: str
) -> List[str]:

    rows = (
        db.query(Run.dataset_id)
        .filter(Run.experiment_id == experiment_id)
        .distinct()
        .all()
    )
    return [dataset_id for (dataset_id,) in rows]


def get_runs_by_experiment_and_dataset(
    db: Session,
    experiment_id: str,
    dataset_id: str
) -> List[Run]:

    return (
        db.query(Run)
        .filter(
            Run.experiment_id == experiment_id,
            Run.dataset_id == dataset_id
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
