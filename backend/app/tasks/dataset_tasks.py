from pathlib import Path

from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.core.storage_space import DatasetSpace
from app.dataset import get_dataset
from app.exceptions.dataset_validation_exception import DatasetValidationError
from app.models.dataset import DatasetExtractionStatus
from app.repositories import dataset_repository
from app.utils.zip_utils import extract_zip


@celery_app.task(
    bind=True,
    autoretry_for=(OSError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    queue="io",
)
def process_dataset_task(self, dataset_id: str) -> None:
    db = SessionLocal()

    try:
        dataset = dataset_repository.get_dataset_by_id(db, dataset_id)
        if not dataset:
            return

        dataset_repository.update_dataset_status(db, dataset_id, DatasetExtractionStatus.PROCESSING)

        dataset_space = DatasetSpace(dataset_id)
        extraction_path = dataset_space.dataset_path
        zip_path = dataset_space.zip_path

        extract_zip(zip_path=Path(zip_path), target_dir=extraction_path)

        dataset_handler = get_dataset(dataset.technology)
        dataset_handler.validate_dataset(extraction_path)

        dataset_repository.update_dataset_status(db, dataset_id, DatasetExtractionStatus.READY)

    except DatasetValidationError as exc:
        dataset_repository.update_dataset_status(
            db, dataset_id, DatasetExtractionStatus.FAILED, str(exc)
        )
    except OSError as exc:
        dataset_repository.update_dataset_status(
            db, dataset_id, DatasetExtractionStatus.FAILED, str(exc)
        )
        raise exc
    finally:
        db.close()
