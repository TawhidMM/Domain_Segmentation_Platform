from typing import Optional

from sqlalchemy.orm import Session

from app.models.experiment import Experiment, ExperimentStatus


def get_experiment_by_id(
    db: Session,
    job_id: str
) -> Optional[Experiment]:

    return db.query(Experiment).filter(Experiment.id == job_id).first()


def create_experiment(
    db: Session,
    experiment: Experiment
) -> Experiment:

    db.add(experiment)
    db.commit()
    db.refresh(experiment)
    return experiment


def update_status(
    db: Session,
    job_id: str,
    status: ExperimentStatus,
    started_at=None,
    finished_at=None
) -> Optional[Experiment]:

    experiment = get_experiment_by_id(db, job_id)
    if not experiment:
        return None

    experiment.status = status
    if started_at is not None:
        experiment.started_at = started_at
    if finished_at is not None:
        experiment.finished_at = finished_at

    db.commit()
    db.refresh(experiment)
    return experiment

