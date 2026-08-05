import logging
from pathlib import Path

import httpx
from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.core.storage_space import DatasetSpace
from app.dataset import get_dataset
from app.exceptions.dataset_validation_exception import DatasetValidationError
from app.models.dataset import DatasetExtractionStatus
from app.repositories import dataset_repository
from app.schemas.dataset import DownloadPhase
from app.utils.zip_utils import extract_zip

logger = logging.getLogger(__name__)


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


@celery_app.task(
    bind=True,
    autoretry_for=(OSError, httpx.HTTPError),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    queue="io",
)
def download_sample_dataset_task(
    self,
    dataset_id: str,
    url: str,
    dataset_name: str
) -> dict:

    dataset_space = DatasetSpace(dataset_id)
    dataset_space.internal_root.mkdir(parents=True, exist_ok=True)
    zip_path = dataset_space.zip_path

    db = SessionLocal()
    try:
        dataset_repository.update_dataset_status(db, dataset_id, DatasetExtractionStatus.PROCESSING)
    finally:
        db.close()

    try:
        self.update_state(state="PROGRESS", meta={"phase": DownloadPhase.DOWNLOADING, "percent": 0})

        with httpx.stream("GET", url, follow_redirects=True, timeout=None) as response:
            response.raise_for_status()
            total = int(response.headers.get("content-length", 0))
            downloaded = 0

            with open(zip_path, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                    f.write(chunk)
                    downloaded += len(chunk)
                    percent = int(downloaded * 100 / total) if total else 0
                    self.update_state(
                        state="PROGRESS",
                        meta={
                            "phase": DownloadPhase.DOWNLOADING,
                            "percent": percent,
                            "downloaded_bytes": downloaded,
                            "total_bytes": total,
                        },
                    )

        logger.info(f"Sample dataset '{dataset_name}' downloaded to {zip_path}")

        process_dataset_task.delay(dataset_id)
        logger.info(f"Registered sample dataset {dataset_id} ({dataset_name}) and enqueued extraction.")

        return {"phase": DownloadPhase.HANDED_OFF, "dataset_id": dataset_id}

    except (httpx.HTTPError, OSError) as exc:
        error_msg = str(exc)
        logger.error(f"Failed to download sample dataset '{dataset_name}': {error_msg}")
        db = SessionLocal()
        try:
            dataset_repository.update_dataset_status(
                db, dataset_id, DatasetExtractionStatus.FAILED, error_msg
            )
        finally:
            db.close()
        raise exc