from .dataset_handler import DatasetUploadHandler
from .result_handler import ResultUploadHandler
from .base import TusUploadHandler

_REGISTRY: dict[str, TusUploadHandler] = {
    h.upload_type: h for h in (DatasetUploadHandler(), ResultUploadHandler())
}


def get_handler(upload_type: str) -> TusUploadHandler:
    handler = _REGISTRY.get(upload_type)
    if handler is None:
        from fastapi import HTTPException
        raise HTTPException(400, f"Invalid or missing upload_type: {upload_type}")
    return handler