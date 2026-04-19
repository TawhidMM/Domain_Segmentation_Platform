from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.annotations import Annotation


def create_annotation(db: Session, annotation: Annotation) -> Annotation:
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


def get_annotations_by_dataset_id(
        db: Session,
        dataset_id: str
) -> list[Annotation]:

    return (
        db.query(Annotation)
        .filter(Annotation.dataset_id == dataset_id)
        .order_by(Annotation.created_at.desc())
        .all()
    )


def get_annotation_by_id(
        db: Session,
        annotation_id: UUID | str
) -> Optional[Annotation]:

    return db.query(Annotation).filter(Annotation.id == str(annotation_id)).first()
