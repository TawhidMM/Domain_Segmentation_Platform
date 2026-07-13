import json
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, BackgroundTasks

from app.core.config import settings
from app.core.redis import RESULT_VALIDATION_SESSION_TTL, get_result_validation_key, redis_client
from app.core.storage import storage
from app.core.storage_space import StagingSpace
from app.schemas.result_validation import ValidationStatus, ValidationPayload, CheckStagedResultsRequest
from app.services import upload_service
from app.tasks.result_validation_task import validate_result_bundle
from app.utils.zip_utils import extract_zip

router = APIRouter()


@router.post("/init", status_code=status.HTTP_200_OK)
async def initialize_import(
    total_chunks: int = Form(...)
):
    stage_id = str(uuid4())
    target_dir = StagingSpace(stage_id).staging_directory

    upload_service.init_upload(
        upload_id= stage_id,
        total_chunks=total_chunks,
        target_dir=target_dir,
        filename=settings.IMPORT_ZIP_FILENAME
    )
    return {"stage_id":  stage_id}


@router.post("/chunk", status_code=status.HTTP_204_NO_CONTENT)
async def upload_import_chunk(
    stage_id: str = Form(...),
    chunk: UploadFile = File(...)
):
    try:
        chunk_bytes = await chunk.read()
        upload_service.upload_chunk(upload_id=stage_id, chunk=chunk_bytes)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/finalize", status_code=status.HTTP_200_OK)
async def finalize_import(
    background_tasks: BackgroundTasks,
    stage_id: str = Form(...),
    dataset_id: str = Form(),
):
    try:
        zip_path = upload_service.finalize_upload(upload_id=stage_id)
        staging_dir = zip_path.parent

        extract_zip(zip_path, staging_dir)
        zip_path.unlink(missing_ok=True)

        payload = ValidationPayload(
            status=ValidationStatus.PROCESSING,
            message="Parsing data matrix schemas..."
        )

        redis_key = get_result_validation_key(stage_id)
        redis_client.setex(redis_key, RESULT_VALIDATION_SESSION_TTL, payload.convert_to_json())

        background_tasks.add_task(
            validate_result_bundle,
            stage_id=stage_id,
            result_directory=staging_dir,
            dataset_id=dataset_id
        )

        return {"stage_id": stage_id, "status": "processing"}

    except Exception:
        raise HTTPException(status_code=500, detail="Failed to initialize backend processing space.")


@router.get("/{stage_id}/status")
async def get_validation_status(stage_id: str):

    redis_key = get_result_validation_key(stage_id)
    data = redis_client.get(redis_key)
    if not data:
        raise HTTPException(status_code=404, detail="Validation task session expired or not found.")

    return json.loads(data)


@router.delete("/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staged_result(stage_id: str):
    try:
        stage_dir = StagingSpace(stage_id).staging_directory

        if not stage_dir.exists():
            raise HTTPException(status_code=404, detail="Staged result not found.")

        storage.delete(stage_dir)

        redis_key = get_result_validation_key(stage_id)
        redis_client.delete(redis_key)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete staged result: {str(e)}")

@router.post("/status", status_code=status.HTTP_200_OK)
async def check_staged_results_validity(
    request: CheckStagedResultsRequest
):

    validity_map = {
        stage_id: StagingSpace(stage_id).staging_directory.exists()
        for stage_id in request.stage_ids
    }

    return validity_map
