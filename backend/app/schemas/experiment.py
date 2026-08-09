from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class ResultSubmitResponse(BaseModel):
    experiment_id: str
    access_token: str
    status: str


class DatasetRunMapping(BaseModel):
    dataset_id: str
    run_ids: List[str]

    class Config:
        from_attributes = True


class ExperimentSubmitResponse(BaseModel):
    experiment_id: str
    access_token: str
    status: str
    runs_by_dataset: List[DatasetRunMapping]

class DataSetRequest(BaseModel):
    dataset_id: str

class DataSetRequests(BaseModel):
    dataset_ids: List[str] = Field(min_length=1)

class DatasetConfigRequest(BaseModel):
    dataset_id: str = Field(min_length=1)
    params: Dict[str, Any] = Field(min_length=1)
    annotation_id: Optional[str] = None


class ExperimentSubmitRequest(BaseModel):
    dataset_configs: List[DatasetConfigRequest] = Field(min_length=1)
    tool_name: str
    seed_list: List[int] = Field(min_length=1)

class ImportResultsDatasetRequest(BaseModel):
    dataset_id: str
    stage_id: str

class ImportResultRequest(BaseModel):
    results: List[ImportResultsDatasetRequest] = Field(min_length=1)
    tool_name: str

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
    experiment_status: str
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


class ExperimentExistenceRequest(BaseModel):
    experiments: List[ExperimentRequest] = Field(min_length=1)


class ConsensusRequest(BaseModel):
    experiments: List[ExperimentRequest]


class DomainComparisonItem(BaseModel):
    experiment_id: str
    dataset_id: str
    token: str


class DomainComparisonRequest(BaseModel):
    experiments: List[DomainComparisonItem]



class SpotData(BaseModel):
    barcode: str
    x: float
    y: float
    domain: int


class DomainData(BaseModel):
    domain_id: int
    color: str


class PredictionResult(BaseModel):
    runId: str
    toolName: str
    spots: List[SpotData]
    domains: List[DomainData]
    has_histology: bool = False


class PredictionMetrics(BaseModel):
    silhouette: float
    davies_bouldin: float
    calinski_harabasz: float
    morans_I: float
    gearys_C: float


class BestRunResponse(BaseModel):
    run_id: str
    result: PredictionResult
    metrics: PredictionMetrics
