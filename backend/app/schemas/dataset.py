from enum import Enum
from pydantic import BaseModel, Field

from app.models.dataset import DatasetTechnology


class DownloadPhase(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    HANDED_OFF = "handed_off"
    FAILED = "failed"


class UpdateDatasetNameRequest(BaseModel):
    dataset_name: str


class SampleDownloadRequest(BaseModel):
    technology: DatasetTechnology


class SampleDownloadResponseItem(BaseModel):
    dataset_id: str
    dataset_name: str
    status: str
    task_id: str


class DownloadProgressRequest(BaseModel):
    dataset_id: str
    task_id: str


class DownloadProgressResponse(BaseModel):
    dataset_id: str
    phase: DownloadPhase
    percent: int | None = None
    downloaded_bytes: int | None = None
    total_bytes: int | None = None
    error: str | None = None
