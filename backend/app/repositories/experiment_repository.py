from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.models.experiment import Experiment


def get_experiment_by_id(
    db: Session,
    job_id: str
) -> Optional[Experiment]:

    return db.query(Experiment).filter(Experiment.id == job_id).first()


def get_experiment_with_runs(
    db: Session,
    experiment_id: str
) -> Optional[Experiment]:

    experiment = (
        db.query(Experiment)
        .filter(Experiment.id == experiment_id)
        .options(joinedload(Experiment.runs))
        .first()
    )
    
    return experiment


def create_experiment(
    db: Session,
    experiment: Experiment
) -> Experiment:

    db.add(experiment)
    db.commit()
    db.refresh(experiment)
    return experiment