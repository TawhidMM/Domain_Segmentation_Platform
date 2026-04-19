from typing import Optional

from sqlalchemy.orm import Session

from app.models.dataset import Dataset


def get_dataset_by_id(db: Session, dataset_id: str) -> Optional[Dataset]:
    return db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()


def create_dataset(db: Session, dataset: Dataset) -> Dataset:
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset

