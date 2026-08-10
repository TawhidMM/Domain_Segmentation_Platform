from typing import List, Optional
from pydantic import BaseModel, model_validator


class AnnotationLabel(BaseModel):
    barcode: str
    label_id: Optional[int] = None
    label_name: Optional[str] = None


class AnnotationCreate(BaseModel):
    dataset_id: str
    labels: List[AnnotationLabel]

    @model_validator(mode="after")
    def validate_at_least_one_labeled(self):
        has_labeled = any(
            (label.label_id is not None)
            or (label.label_name and label.label_name.strip())
            for label in self.labels
        )
        if not has_labeled:
            raise ValueError("Annotation must contain at least one labeled spot")
        return self


class AnnotationResponse(BaseModel):
    annotation_id: str
    dataset_id: str


class AnnotationGetRequest(BaseModel):
    dataset_id: str
    annotation_id: str


class AnnotationFileResponse(BaseModel):
    annotation_id: str
    dataset_id: str
    labels: List[AnnotationLabel]
