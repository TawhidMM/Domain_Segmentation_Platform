from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.repositories import dataset_repository


def create_dataset(
    db: Session,
    upload_id: str,
    zip_path: str,
    dataset_name: Optional[str] = None,
) -> str:

    normalized_name = (dataset_name or "").strip()
    if not normalized_name:
        next_index = dataset_repository.count_datasets(db) + 1
        normalized_name = f"dataset-{next_index}"

    dataset = Dataset(
        dataset_id=upload_id,
        dataset_name=normalized_name,
        zip_path=str(zip_path),
        created_at=datetime.now(timezone.utc)
    )

    dataset_repository.create_dataset(db, dataset)

    return dataset.dataset_id