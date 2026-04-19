from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.run_config import RunConfig


def get_run_config_by_id(
    db: Session,
    run_config_id: str,
) -> Optional[RunConfig]:
    return db.query(RunConfig).filter(RunConfig.id == run_config_id).first()


def get_dataset_ids_by_experiment(
    db: Session,
    experiment_id: str,
) -> List[str]:
    rows = (
        db.query(RunConfig.dataset_id)
        .filter(RunConfig.experiment_id == experiment_id)
        .distinct()
        .all()
    )
    return [dataset_id for (dataset_id,) in rows]


def create_run_config(
    db: Session,
    run_config: RunConfig,
) -> RunConfig:
    db.add(run_config)
    db.commit()
    db.refresh(run_config)
    return run_config


def create_run_configs_batch(
    db: Session,
    run_configs: List[RunConfig],
) -> List[RunConfig]:
    db.add_all(run_configs)
    db.commit()
    for run_config in run_configs:
        db.refresh(run_config)
    return run_configs
