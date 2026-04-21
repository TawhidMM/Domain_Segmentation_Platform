from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.dataset import Dataset


def get_dataset_by_id(db: Session, dataset_id: str) -> Optional[Dataset]:
    return db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()


def create_dataset(db: Session, dataset: Dataset) -> Dataset:
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


def count_datasets(db: Session) -> int:
    return db.query(func.count(Dataset.dataset_id)).scalar() or 0


def get_datasets_by_ids(db: Session, dataset_ids: List[str]) -> List[Dataset]:
    return db.query(Dataset).filter(Dataset.dataset_id.in_(dataset_ids)).all()

