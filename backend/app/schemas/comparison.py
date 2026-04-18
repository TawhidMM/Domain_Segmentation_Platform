from dataclasses import dataclass
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Unified request schema used by all /comparison/* endpoints ──────────────

class ExperimentRequestItem(BaseModel):
    experiment_id: str
    token: str


class ComparisonRequest(BaseModel):
    dataset_id: str
    experiments: List[ExperimentRequestItem] = Field(min_length=1)


class ComparisonMetricsRequest(BaseModel):
    experiments: List[ExperimentRequestItem] = Field(min_length=1)


class ExperimentMetricsRequest(BaseModel):
    experiment_id: str
    token: str


# ── /comparison/datasets specific models ────────────────────────────────────

class ComparisonDatasetsRequest(BaseModel):
    experiments: List[ExperimentRequestItem] = Field(min_length=1)


class ComparisonDatasetToolItem(BaseModel):
    experiment_id: str
    tool_name: str


class ComparisonDatasetsResponseItem(BaseModel):
    dataset_id: str
    tools: List[ComparisonDatasetToolItem]


class ComparisonDatasetsResponse(BaseModel):
    datasets: List[ComparisonDatasetsResponseItem]


# ── Internal context object (service layer only) ─────────────────────────────

@dataclass(frozen=True)
class ExperimentContext:
    experiment_id: str
    dataset_id: str
    token: Optional[str] = None
