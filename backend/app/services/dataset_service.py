from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.repositories import dataset_repository


def create_dataset(
    db: Session,
    upload_id: str,
    zip_path: str
) -> str:

    dataset = Dataset(
        dataset_id=upload_id,
        zip_path=str(zip_path),
        created_at=datetime.now(timezone.utc)
    )

    dataset_repository.create_dataset(db, dataset)

    return dataset.dataset_id