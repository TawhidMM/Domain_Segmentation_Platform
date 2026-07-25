import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.storage_space import DatasetSpace
from app.models.dataset import Dataset, DatasetTechnology
from app.repositories import dataset_repository
from app.tasks.dataset_tasks import process_dataset_task
from .base import TusUploadHandler

logger = logging.getLogger(__name__)


class DatasetUploadHandler(TusUploadHandler):
    upload_type = "dataset"

    async def pre_create(self, event: Dict[str, Any]) -> dict:
        metadata = event.get("Upload", {}).get("MetaData", {})
        dataset_name = metadata.get("dataset_name", "").strip()
        technology = metadata.get("technology")

        if not dataset_name:
            raise HTTPException(400, "Missing dataset_name in upload metadata.")
        if not technology:
            raise HTTPException(400, "Missing technology in upload metadata.")
        try:
            DatasetTechnology(technology)
        except ValueError:
            raise HTTPException(400, f"Unsupported technology: {technology}")

        dataset_id = str(uuid.uuid4())
        dataset_space = DatasetSpace(dataset_id)

        return {
            "HttpResponse": {"StatusCode": 200},
            "ChangeFileInfo": {
                "ID": dataset_id,
                "Storage": {
                    "Path": str(dataset_space.upload_path),
                    "InfoPath": str(dataset_space.internal_root / "info.json"),
                },
            },
        }

    async def post_finish(self, event: Dict[str, Any]) -> dict:
        db: Session = next(get_db())
        try:
            upload_info = event.get("Upload", {})
            upload_id = upload_info.get("ID")
            metadata = upload_info.get("MetaData", {})


            dataset_name = (metadata.get("dataset_name", "").strip() or
                            f"dataset-{dataset_repository.count_datasets(db) + 1}")
            technology = DatasetTechnology(metadata.get("technology", DatasetTechnology.VISIUM.value))

            dataset_space = DatasetSpace(upload_id)
            zip_path = dataset_space.zip_path

            dataset = Dataset(
                dataset_id=upload_id,
                dataset_name=dataset_name,
                zip_path=str(zip_path),
                technology=technology,
                created_at=datetime.now(timezone.utc),
            )
            dataset_repository.create_dataset(db, dataset)

            try:
                db.commit()
            except Exception as exc:
                db.rollback()
                logger.error(f"Failed to commit Dataset row: {exc}")
                raise HTTPException(500, "Database error during dataset creation.")

            process_dataset_task.delay(upload_id)
            logger.info(f"Registered dataset {upload_id} ({dataset_name}) and enqueued extraction.")

            info_file = dataset_space.base_directory().parent / f"{upload_id}.info"
            info_file.unlink(missing_ok=True)

            return {"status": "ok", "dataset_id": upload_id}
        finally:
            db.close()