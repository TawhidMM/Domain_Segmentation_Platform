from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.storage_space import DatasetSpace
from app.repositories.dataset_repository import get_valid_dataset_ids, get_dataset_by_id
from app.schemas.experiment import DataSetRequest, DataSetRequests
from app.services import spatial_data_service
from app.services.dataset_service import create_dataset, delete_dataset, update_dataset_name
from app.services.run_service import require_run_with_access, build_run_context
from app.services.upload_service import (
    init_upload, upload_chunk, finalize_upload
)
from app.tasks.dataset_tasks import extract_dataset_task
from app.dataset.visium import VisiumDataset

router = APIRouter()


class UpdateDatasetNameRequest(BaseModel):
    dataset_name: str


@router.post("/init-upload")
def init(
    total_chunks: int = Form(...)
):
    upload_id = str(uuid4())
    upload_directory = DatasetSpace(upload_id).upload_directory

    init_upload(
        upload_id=upload_id,
        total_chunks=total_chunks,
        target_dir=upload_directory,
        filename=settings.DATASET_ZIP_FILENAME
    )
    return {"upload_id": upload_id}


@router.post("/upload-chunk")
async def upload(
    upload_id: str = Form(...),
    chunk: UploadFile = File(...)
):
    upload_chunk(upload_id, await chunk.read())
    return {"status": "ok"}


@router.post("/finalize-upload")
async def finalize(
    upload_id: str = Form(...),
    dataset_name: Optional[str] = Form(default=None),
    db: Session = Depends(get_db)
):

    zip_path = finalize_upload(upload_id)

    dataset_id = create_dataset(
        db=db,
        upload_id=upload_id,
        zip_path=zip_path,
        dataset_name=dataset_name,
    )

    extract_dataset_task.delay(dataset_id, str(zip_path))

    return {"dataset_id": dataset_id, "status": "processing"}


@router.get("/{dataset_id}/status")
async def get_dataset_status(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = get_dataset_by_id(db, dataset_id)

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    return {
        "dataset_id": dataset.dataset_id,
        "status": dataset.status.value,
        "error": dataset.error_message,
    }


@router.patch("/{dataset_id}/name")
def update_name(
    dataset_id: str,
    request: UpdateDatasetNameRequest,
    db: Session = Depends(get_db)
):
    dataset = update_dataset_name(db, dataset_id, request.dataset_name)
    return {"dataset_id": dataset.dataset_id, "dataset_name": dataset.dataset_name}


@router.get("/{run_id}/histology", responses={200: {"content": {"image/png": {}}}})
def get_histology(
    run_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)

    dataset_dir = run_context.dataset_path

    spatial_dir = dataset_dir / "spatial"
    if not spatial_dir.exists():
        # For ScribbleDom structure
        possible_paths = list(dataset_dir.rglob("spatial"))
        if possible_paths:
            spatial_dir = possible_paths[0]
        else:
            raise HTTPException(
                status_code=404, 
                detail="No spatial result_directory found")
    
    # Get histology image path
    image_path, image_type = VisiumDataset().get_histology_image_path(spatial_dir)
    
    if image_path is None:
        raise HTTPException(
            status_code=404,
            detail="No histology image available"
        )
    
    # Return image with caching headers
    return FileResponse(
        path=image_path,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Type": "image/png"
        }
    )


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    request: DataSetRequest,
    db: Session = Depends(get_db)
):

    delete_dataset(db, request.dataset_id)


@router.post("/spatial-data")
def get_spatial_data(
    dataset_request: DataSetRequest,
    http_request: Request
):
    return spatial_data_service.build_spatial_data_response_from_dataset(
        dataset_id=dataset_request.dataset_id,
        http_request=http_request,
    )


@router.post("/check-existence")
async def get_valid_datasets(
    dataset_requests: DataSetRequests,
    db: Session = Depends(get_db)
):
    valid_dataset_ids = get_valid_dataset_ids(db, dataset_requests.dataset_ids)

    return {"validIds": valid_dataset_ids}