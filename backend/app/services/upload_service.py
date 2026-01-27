from datetime import datetime, timezone
from uuid import uuid4

from app.core.config import UPLOAD_DIR, UPLOAD_ZIP_FILENAME
from app.core.storage import storage

_upload_sessions = {}

def init_upload(filename: str, total_chunks: int):
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    upload_id = f"{timestamp}_{uuid4().hex[:4]}"

    path = UPLOAD_DIR / f"upload_{upload_id}" / UPLOAD_ZIP_FILENAME
    _upload_sessions[upload_id] = {
        "path": path,
        "total": total_chunks,
        "received": 0
    }
    return upload_id

def upload_chunk(upload_id: str, chunk: bytes):
    session = _upload_sessions[upload_id]
    storage.save_chunk(session["path"], chunk)
    session["received"] += 1

def finalize_upload(upload_id: str):
    session = _upload_sessions.pop(upload_id)
    return session["path"]