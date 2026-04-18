from typing import Any, Dict, List

from pydantic import BaseModel


class AnnotationCreate(BaseModel):
    dataset_id: str
    labels: List[Dict[str, Any]]


class AnnotationResponse(BaseModel):
    annotation_id: str
    dataset_id: str


class AnnotationGetRequest(BaseModel):
    dataset_id: str
    annotation_id: str


class AnnotationFileResponse(BaseModel):
    annotation_id: str
    dataset_id: str
    labels: List[Dict[str, Any]]