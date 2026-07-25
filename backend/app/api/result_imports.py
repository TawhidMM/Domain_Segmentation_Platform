import json

from fastapi import APIRouter, HTTPException, status

from app.core.redis import RESULT_VALIDATION_SESSION_TTL, get_result_validation_key, redis_client
from app.core.storage import storage
from app.core.storage_space import StagingSpace
from app.schemas.result_validation import ValidationPayload, CheckStagedResultsRequest

router = APIRouter()


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
    event: CheckStagedResultsRequest
):

    validity_map = {
        stage_id: StagingSpace(stage_id).staging_directory.exists()
        for stage_id in event.stage_ids
    }

    return validity_map
