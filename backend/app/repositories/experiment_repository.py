from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.models.experiment import Experiment
from app.models.run_config import RunConfig


def get_experiment_by_id(
    db: Session,
    job_id: str
) -> Optional[Experiment]:

    return db.query(Experiment).filter(Experiment.id == job_id).first()


def get_experiment_with_runs(
    db: Session,
    experiment_id: str
) -> Optional[Experiment]:

    # Backward-compatible alias.
    return get_experiment_with_run_configs(db, experiment_id)


def get_experiment_with_run_configs(
    db: Session,
    experiment_id: str
) -> Optional[Experiment]:

    experiment = (
        db.query(Experiment)
        .filter(Experiment.id == experiment_id)
        .options(
            joinedload(Experiment.run_configs).joinedload(RunConfig.runs)
        )
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