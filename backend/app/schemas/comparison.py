from typing import List

from pydantic import BaseModel, Field


class ComparisonDatasetsRequestItem(BaseModel):
    experiment_id: str
    token: str


class ComparisonDatasetsRequest(BaseModel):
    experiments: List[ComparisonDatasetsRequestItem] = Field(min_length=1)


class ComparisonDatasetToolItem(BaseModel):
    experiment_id: str
    tool_name: str


class ComparisonDatasetsResponseItem(BaseModel):
    dataset_id: str
    tools: List[ComparisonDatasetToolItem]


class ComparisonDatasetsResponse(BaseModel):
    datasets: List[ComparisonDatasetsResponseItem]
