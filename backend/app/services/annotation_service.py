import json
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.annotations import Annotation
from app.repositories.annotation_repository import (
    create_annotation as create_annotation_record,
    get_annotation_by_id,
)
from app.repositories.dataset_repository import get_dataset_by_id


def ensure_dataset_exists(
    db: Session,
    dataset_id: str
) -> None:

    dataset = get_dataset_by_id(db, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found")


def build_annotation_directory(
    dataset_id: str
) -> Path:
    return settings.UPLOAD_ROOT / f"upload_{dataset_id}" / "annotations"


def build_annotation_path(
        dataset_id: str,
        annotation_id: str
) -> Path:

    return build_annotation_directory(dataset_id) / f"{annotation_id}.json"


def create_annotation(
        db: Session,
        dataset_id: str,
        labels: List[Dict[str, Any]]
) -> Annotation:

    ensure_dataset_exists(db, dataset_id)

    annotation_id = str(uuid.uuid4())
    file_path = build_annotation_path(dataset_id, annotation_id)
    file_path.parent.mkdir(parents=True, exist_ok=True)

    annotation_payload = {
        "annotation_id": str(annotation_id),
        "dataset_id": dataset_id,
        "labels": labels,
    }
    file_path.write_text(json.dumps(annotation_payload, indent=4), encoding="utf-8")

    print(f"Created annotation file at {file_path}")

    annotation = Annotation(
        id=annotation_id,
        dataset_id=dataset_id,
        file_path=str(file_path),
        source="manual",
    )
    return create_annotation_record(db, annotation)


def _load_annotation_json(
        file_path: Path
) -> Dict[str, Any]:

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Annotation file not found at '{file_path}'")

    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Stored annotation file is invalid JSON") from exc


def get_annotation_json(
    db: Session,
    dataset_id: str,
    annotation_id: uuid.UUID | str
) -> Dict[str, Any]:

    ensure_dataset_exists(db, dataset_id)

    annotation = get_annotation_by_id(db, annotation_id)
    if annotation is None:
        raise HTTPException(status_code=404, detail=f"Annotation '{annotation_id}' not found")

    if annotation.dataset_id != dataset_id:
        raise HTTPException(
            status_code=400,
            detail="Annotation does not belong to the provided dataset_id",
        )

    return _load_annotation_json(Path(annotation.file_path))
