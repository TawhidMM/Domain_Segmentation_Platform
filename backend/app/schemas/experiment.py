from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ExperimentSubmitResponse(BaseModel):
    experiment_id: str
    access_token: str
    status: str

class DataSetRequest(BaseModel):
    dataset_id: str

class DatasetConfigRequest(BaseModel):
    dataset_id: str
    params: Dict[str, Any]


class ExperimentSubmitRequest(BaseModel):
    dataset_configs: List[DatasetConfigRequest] = Field(min_length=1)
    tool_name: str
    number_of_runs: int = Field(default=1, ge=1)
    seed_list: Optional[List[int]] = None


class RunStatusResponse(BaseModel):
    run_id: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DatasetWithRunsResponse(BaseModel):
    dataset_id: str
    dataset_name: str
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


class DomainComparisonItem(BaseModel):
    experiment_id: str
    dataset_id: str
    token: str


class DomainComparisonRequest(BaseModel):
    experiments: List[DomainComparisonItem]