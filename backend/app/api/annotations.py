from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.annotation_schema import (
    AnnotationCreate,
    AnnotationFileResponse,
    AnnotationGetRequest,
    AnnotationResponse,
)
from app.services.annotation_service import create_annotation, get_annotation_json

router = APIRouter()


@router.post("/annotations", response_model=AnnotationResponse)
def create_annotation_route(
    create_request: AnnotationCreate,
    db: Session = Depends(get_db),
) -> AnnotationResponse:
    annotation = create_annotation(
        db,
        dataset_id=create_request.dataset_id,
        labels=create_request.labels,
    )

    return AnnotationResponse(
        annotation_id=str(annotation.id),
        dataset_id=annotation.dataset_id,
    )


@router.post("/get-annotation", response_model=AnnotationFileResponse)
def get_annotation_file(
    annotation_request: AnnotationGetRequest,
    db: Session = Depends(get_db),
) -> AnnotationFileResponse:

    payload = get_annotation_json(
        db,
        dataset_id=annotation_request.dataset_id,
        annotation_id=annotation_request.annotation_id,
    )

    return AnnotationFileResponse(**payload)
