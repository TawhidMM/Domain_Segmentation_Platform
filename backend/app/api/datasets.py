from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.dataset_service import create_dataset
from app.services.upload_service import (
    init_upload, upload_chunk, finalize_upload
)

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
