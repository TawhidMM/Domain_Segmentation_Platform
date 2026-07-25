import logging
import uuid
from typing import Dict, Any

from app.core.redis import get_result_validation_key, RESULT_VALIDATION_SESSION_TTL, redis_client
from app.core.storage_space import StagingSpace
from app.schemas.result_validation import ValidationPayload, ValidationStatus
from app.tasks.result_validation_task import validate_result_bundle
from .base import TusUploadHandler

logger = logging.getLogger(__name__)


class ResultUploadHandler(TusUploadHandler):
    upload_type = "pre_computed_result"

    async def pre_create(self, event: Dict[str, Any]) -> dict:
        stage_id = str(uuid.uuid4())
        staging_space = StagingSpace(stage_id)
        return {
            "HttpResponse": {"StatusCode": 200},
            "ChangeFileInfo": {
                "ID": stage_id,
                "Storage": {
                    "Path": str(staging_space.upload_path),
                    "InfoPath": str(staging_space.internal_root / "info.json"),
                },
            },
        }

    async def post_finish(self, event: Dict[str, Any]) -> dict:
        print(event)


        upload_info = event.get("Upload", {})
        metadata = upload_info.get("MetaData", {})
        stage_id = upload_info.get("ID")
        dataset_id = metadata.get("dataset_id")

        print(f"stage_id: {stage_id}, dataset_id: {dataset_id}")


        staging_space = StagingSpace(stage_id)
        payload = ValidationPayload(
            status=ValidationStatus.PROCESSING,
            message="Queued for extraction..."
        )
        redis_client.setex(
            get_result_validation_key(stage_id),
            RESULT_VALIDATION_SESSION_TTL,
            payload.convert_to_json()
        )

        validate_result_bundle.delay(
            stage_id=stage_id,
            zip_path=str(staging_space.zip_path),
            dataset_id=dataset_id,
        )

        info_file = staging_space.base_directory().parent / f"{stage_id}.info"
        info_file.unlink(missing_ok=True)

        return {"stage_id": stage_id, "status": "processing"}