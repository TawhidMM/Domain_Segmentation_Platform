from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExperimentSubmitResponse(BaseModel):
    """Response from POST /submit endpoint."""
    job_id: str
    access_token: str
    status: str


class ExperimentStatusResponse(BaseModel):
    """Response from GET /jobs/{_job_id} endpoint."""
    job_id: str
    status: str
    tool_name: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExperimentResultResponse(BaseModel):
    """Response from GET /result/{_job_id} endpoint."""
    job_id: str
    status: str
    result: dict
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportMetadata(BaseModel):
    """Metadata embedded in SVG export."""
    job_id: str
    tool: str
    parameters: dict
    created_at: str
    exported_at: str
    dataset: str
    backend_version: str
    export_format: str


class ExportResponse(BaseModel):
    """Info about export request (for structured responses)."""
    job_id: str
    format: str
    include_metadata: bool
    bundle: bool
    created_at: str

