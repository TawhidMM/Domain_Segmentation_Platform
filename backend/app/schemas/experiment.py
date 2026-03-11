from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ExperimentSubmitResponse(BaseModel):
    experiment_id: str
    access_token: str
    status: str


class RunStatusResponse(BaseModel):
    run_id: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DatasetWithRunsResponse(BaseModel):
    dataset_id: str
    runs: List[RunStatusResponse]

    class Config:
        from_attributes = True


class ExperimentStatusResponse(BaseModel):
    experiment_id: str
    tool_name: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    datasets: List[DatasetWithRunsResponse]

    class Config:
        from_attributes = True


class CompareBoxplotsDownloadRequest(BaseModel):
    experiment_ids: List[str]


class ExperimentRequest(BaseModel):
    experiment_id: str
    token: str


class ConsensusRequest(BaseModel):
    experiments: List[ExperimentRequest]