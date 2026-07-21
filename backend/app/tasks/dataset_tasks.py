from pathlib import Path

from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.core.storage_space import DatasetSpace
from app.models.dataset import DatasetExtractionStatus
from app.repositories import dataset_repository
from app.utils.zip_utils import extract_zip


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    queue="io"
)
def extract_dataset_task(self, dataset_id: str, zip_path: str) -> None:
    db = SessionLocal()

    try:
        dataset_repository.update_dataset_status(db, dataset_id, DatasetExtractionStatus.PROCESSING)

        dataset_space = DatasetSpace(dataset_id)
        extraction_path = dataset_space.dataset_path

        extract_zip(zip_path=Path(zip_path), target_dir=extraction_path)

        dataset_repository.update_dataset_status(db, dataset_id, DatasetExtractionStatus.READY)

    except OSError as exc:
        dataset_repository.update_dataset_status(db, dataset_id, DatasetExtractionStatus.FAILED)
        raise exc
    finally:
        db.close()
