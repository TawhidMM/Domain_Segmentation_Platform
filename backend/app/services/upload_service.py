from pathlib import Path

from app.core.storage import storage

_upload_sessions = {}

def init_upload(
    upload_id: str,
    total_chunks: int,
    target_dir: Path,
    filename: str
) -> None:

    target_dir.mkdir(parents=True, exist_ok=True)

    _upload_sessions[upload_id] = {
        "path": target_dir / filename,
        "total": total_chunks,
        "received": 0
    }


def upload_chunk(upload_id: str, chunk: bytes):

    session = _upload_sessions[upload_id]
    storage.save_chunk(session["path"], chunk)
    session["received"] += 1


def finalize_upload(upload_id: str):
    session = _upload_sessions.pop(upload_id)
    return session["path"]
