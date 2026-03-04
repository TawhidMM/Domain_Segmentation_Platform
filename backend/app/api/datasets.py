from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.workspace import Workspace
from app.services.dataset_service import create_dataset
from app.services.upload_service import (
    init_upload, upload_chunk, finalize_upload
)
from app.services import experiment_service
from app.utils.visium import get_histology_image_path

router = APIRouter()

@router.post("/init-upload")
def init(
    total_chunks: int = Form(...)
):
    upload_id = init_upload(total_chunks)
    return {"upload_id": upload_id}


@router.post("/upload-chunk")
async def upload(
    upload_id: str = Form(...),
    chunk: UploadFile = File(...)
):
    upload_chunk(upload_id, await chunk.read())
    return {"status": "ok"}


@router.post("/finalize-upload")
def finalize(
    upload_id: str = Form(...),
    db: Session = Depends(get_db)
):

    zip_path = finalize_upload(upload_id)

    dataset_id = create_dataset(
        db=db,
        upload_id=upload_id,
        zip_path=zip_path
    )

    return {"dataset_id": dataset_id}

@router.get("/{job_id}/histology", responses={200: {"content": {"image/png": {}}}})
def get_histology(
    job_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    print("[][][][][][][][][][][][")
    experiment = experiment_service.require_experiment_with_access(db, job_id, token)
    
    # Get workspace and locate spatial directory
    workspace = Workspace(job_id)
    
    # Try to find spatial directory in common locations
    spatial_dir = workspace.input_dir / "spatial"
    if not spatial_dir.exists():
        # For ScribbleDom structure
        possible_paths = list(workspace.input_dir.rglob("spatial"))
        if possible_paths:
            spatial_dir = possible_paths[0]
        else:
            raise HTTPException(
                status_code=404, 
                detail="No spatial directory found")
    
    # Get histology image path
    image_path, image_type = get_histology_image_path(spatial_dir)
    
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