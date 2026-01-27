from fastapi import APIRouter, UploadFile, File, Form

from app.services.upload_service import (
    init_upload, upload_chunk, finalize_upload
)

router = APIRouter()

@router.post("/init-upload")
def init(filename: str = Form(...), total_chunks: int = Form(...)):
    upload_id = init_upload(filename, total_chunks)
    return {"upload_id": upload_id}

@router.post("/upload-chunk")
async def upload(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...)
):
    upload_chunk(upload_id, await chunk.read())
    return {"status": "ok"}

@router.post("/finalize-upload")
def finalize(upload_id: str = Form(...)):
    zip_path = finalize_upload(upload_id)
    # extract_dataset(zip_path, upload_id)
    return {"upload_id": upload_id, "status": "processing"}