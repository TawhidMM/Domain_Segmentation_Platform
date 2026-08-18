import json
from io import BytesIO

from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories import experiment_repository, run_repository
from app.schemas.comparison import (
    ComparisonDatasetsRequest,
    ComparisonDatasetsResponse,
    ComparisonMetricsRequest,
    ComparisonRequest,
    ExperimentMetricsRequest,
)
from app.schemas.experiment import (
    BestRunResponse,
    DomainComparisonItem,
    ExperimentRequest,
    ExperimentExistenceRequest,
    ExperimentSubmitRequest,
    ResultSubmitResponse,
    ExperimentSubmitResponse,
    ExperimentStatusResponse,
    ImportResultRequest
)
from app.services import comparison_service
from app.services import experiment_service
from app.services import export_service
from app.services import metrics_service
from app.services import spatial_data_service
from app.services.experiment_service import delete_experiment
from app.tasks.experiment_tasks import run_task
from app.tasks.result_processing_task import process_imported_results

router = APIRouter()


@router.post("/submit", response_model=ExperimentSubmitResponse)
async def submit_experiment(
    request: ExperimentSubmitRequest,
    db: Session = Depends(get_db)
):
    experiment_id, access_token, runs_by_dataset = experiment_service.create_experiment_record(
        db=db,
        dataset_param_configs=request.dataset_configs,
        tool_id=request.tool_id,
        experiment_name=request.experiment_name,
        seed_list=request.seed_list
    )

    runs = run_repository.get_runs_by_experiment(db, experiment_id)
    for run in runs:
        run_task.delay(run.id)

    return ExperimentSubmitResponse(
        experiment_id=experiment_id,
        access_token=access_token,
        status="queued",
        runs_by_dataset=runs_by_dataset
    )


@router.post("/submit-imported", response_model=ResultSubmitResponse)
async def submit_imported_experiment(
    request: ImportResultRequest,
    db: Session = Depends(get_db)
):

    experiment_id, access_token, staging_data = experiment_service.create_imported_experiment_record(
        db=db,
        results=request.results,
        experiment_name=request.experiment_name
    )

    process_imported_results.delay(
        staging_data=staging_data
    )

    return ResultSubmitResponse(
        experiment_id=experiment_id,
        access_token=access_token,
        status="queued"
    )


@router.post("/details", response_model=ExperimentStatusResponse)
def experiment_details(
    request: ExperimentRequest,
    db: Session = Depends(get_db)
):

    response_data = experiment_service.build_experiment_details(
        db,
        request.experiment_id,
        request.token,
    )

    return ExperimentStatusResponse(**response_data)


@router.delete("/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    request: ExperimentRequest,
    db: Session = Depends(get_db)
):

    delete_experiment(db, request.experiment_id, request.token)


@router.post("/best-run", response_model=BestRunResponse)
def get_best_run_result(
    request: DomainComparisonItem,
    db: Session = Depends(get_db)
):
    best_run_context = metrics_service.select_best_run_for_experiment(db, request)

    result = json.loads(best_run_context.result_file.read_text())
    metrics = json.loads(best_run_context.metrics_file.read_text())

    return BestRunResponse(
        run_id=best_run_context.run_id,
        result=result,
        metrics=metrics,
    )


@router.post("/run-metrics")
def get_experiment_run_metrics(
    request: ExperimentMetricsRequest,
    db: Session = Depends(get_db)
):
    return metrics_service.get_experiment_run_metrics(db, request)




@router.post("/compare/consensus")
def get_consensus_predictions(
    request: ComparisonRequest,
    db: Session = Depends(get_db)
):
    return export_service.build_consensus_predictions(db=db, request=request)


@router.post("/comparison/datasets", response_model=ComparisonDatasetsResponse)
def discover_comparison_datasets(
    request: ComparisonDatasetsRequest,
    db: Session = Depends(get_db)
):
    return comparison_service.discover_datasets_for_comparison(db=db, request=request)


@router.post("/compare/overlay-domain-map")
def get_overlay_domain_map(
    request: ComparisonRequest,
    db: Session = Depends(get_db)
):
    if len(request.experiments) < 2:
        raise HTTPException(status_code=400, detail="At least two experiments are required")

    return export_service.build_overlay_domain_map(db=db, request=request)



@router.post("/domain-comparison")
def get_domain_comparison(
    request: ComparisonRequest,
    db: Session = Depends(get_db)
):
    if len(request.experiments) != 2:
        raise HTTPException(status_code=400, detail="Exactly two experiments are required")

    item_a, item_b = request.experiments
    if item_a.experiment_id == item_b.experiment_id:
        raise HTTPException(status_code=400, detail="Experiments must be different")

    return export_service.build_domain_comparison(db=db, request=request)


@router.post("/compare/download-boxplots")
def download_compare_matrics(
    request: ComparisonMetricsRequest,
    db: Session = Depends(get_db)
):
    data, content_type, filename = export_service.export_metric_zip(
        db=db,
        request=request
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/spatial-data")
def get_spatial_data(
    payload: DomainComparisonItem,
    http_request: Request
):
    return spatial_data_service.build_spatial_data_response(
        request_payload=payload,
        http_request=http_request,
    )


@router.post("/check-existence")
async def check_experiments_existence(
    request: ExperimentExistenceRequest,
    db: Session = Depends(get_db)
):
    pairs = [(item.experiment_id, item.token) for item in request.experiments]

    valid_ids = experiment_repository.get_valid_experiment_ids(db, pairs)

    return {"validIds": valid_ids}

