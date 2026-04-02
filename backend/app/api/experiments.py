import base64
import json
from io import BytesIO
from typing import Any, List
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories import run_repository
from app.schemas.comparison import (
    ComparisonDatasetsRequest,
    ComparisonDatasetsResponse,
    ComparisonMetricsRequest,
    ComparisonRequest,
    ExperimentMetricsRequest,
)
from app.schemas.experiment import (
    DomainComparisonItem,
    ExperimentRequest,
    ExperimentSubmitRequest,
    ExperimentSubmitResponse,
    ExperimentStatusResponse
)
from app.services import comparison_service
from app.services import experiment_service
from app.services import export_service
from app.services import metrics_service
from app.services import spatial_data_service
from app.tasks.experiment_tasks import run_task

router = APIRouter()


def _decode_compare_payload(encoded: str) -> Any:
    if not encoded:
        raise HTTPException(status_code=400, detail="Missing comparison payload")

    try:
        padded = encoded + "=" * (-len(encoded) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        try:
            return json.loads(unquote(encoded))
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid comparison payload") from exc


def _extract_compare_items(payload: Any) -> List[dict]:
    items: List[dict] = []

    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        if "experiments" in payload and isinstance(payload["experiments"], list):
            items = payload["experiments"]
        elif "jobs" in payload and "tokens" in payload:
            jobs = payload.get("jobs") or []
            tokens = payload.get("tokens") or []
            items = [
                {"experiment_id": experiment_id, "token": token}
                for experiment_id, token in zip(jobs, tokens)
            ]
        elif "experiment_ids" in payload and "tokens" in payload:
            jobs = payload.get("experiment_ids") or []
            tokens = payload.get("tokens") or []
            items = [
                {"experiment_id": experiment_id, "token": token}
                for experiment_id, token in zip(jobs, tokens)
            ]
        elif "runs" in payload and "tokens" in payload:
            runs = payload.get("runs") or []
            tokens = payload.get("tokens") or []
            items = [
                {"run_id": run_id, "token": token}
                for run_id, token in zip(runs, tokens)
            ]
        elif "runIds" in payload and "tokens" in payload:
            runs = payload.get("runIds") or []
            tokens = payload.get("tokens") or []
            items = [
                {"run_id": run_id, "token": token}
                for run_id, token in zip(runs, tokens)
            ]
        else:
            items = [payload]
    else:
        raise HTTPException(status_code=400, detail="Invalid comparison payload format")

    normalized = []
    for item in items:
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail="Invalid experiment item in payload")

        experiment_id = (
            item.get("experiment_id")
            or item.get("experimentId")
            or item.get("job_id")
            or item.get("jobId")
        )
        run_id = item.get("run_id") or item.get("runId") or item.get("id")
        token = item.get("token") or item.get("access_token")
        label = item.get("label") or item.get("name")

        if (not run_id and not experiment_id) or not token:
            raise HTTPException(
                status_code=400,
                detail="Experiment item missing experiment_id/run_id or token"
            )

        normalized.append({
            "experiment_id": experiment_id,
            "run_id": run_id,
            "token": token,
            "label": label
        })

    return normalized





@router.post("/submit", response_model=ExperimentSubmitResponse)
async def submit_experiment(
    request: ExperimentSubmitRequest,
    db: Session = Depends(get_db)
):
    experiment_id, access_token = experiment_service.create_experiment_record(
        db=db,
        dataset_param_configs=request.dataset_configs,
        tool_name=request.tool_name,
        number_of_runs=request.number_of_runs,
        seed_list=request.seed_list
    )

    runs = run_repository.get_runs_by_experiment(db, experiment_id)
    for run in runs:
        run_task.delay(run.id)

    return ExperimentSubmitResponse(
        experiment_id=experiment_id,
        access_token=access_token,
        status="queued"
    )


@router.post("/details", response_model=ExperimentStatusResponse)
def get_experiment_status(
    request: ExperimentRequest,
    db: Session = Depends(get_db)
):

    response_data = experiment_service.build_nested_experiment_response(
        db,
        request.experiment_id,
        request.token,
    )

    return ExperimentStatusResponse(**response_data)


@router.post("/best-run")
def get_best_run_result(
    request: DomainComparisonItem,
    db: Session = Depends(get_db)
):
    best_run_context = metrics_service.select_best_run_for_experiment(db, request)

    result = json.loads(best_run_context.result_file.read_text())

    return result


@router.post("/run-metrics")
def get_experiment_run_metrics(
    request: ExperimentMetricsRequest,
    db: Session = Depends(get_db)
):
    return metrics_service.get_experiment_run_metrics(db, request)


@router.get("/compare/export/metrics")
def export_compare_metrics(
    c: str = Query(...),
    format: str = Query("svg"),
    db: Session = Depends(get_db)
):
    if format != "svg":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {format}. Only 'svg' is supported."
        )

    payload = _decode_compare_payload(c)
    items = _extract_compare_items(payload)

    if len(items) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two experiments are required for comparison export"
        )

    data, content_type, filename = export_service.export_compare_metrics(
        db=db,
        experiments=items,
        format_type=format
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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
def download_compare_boxplots(
    request: ComparisonMetricsRequest,
    db: Session = Depends(get_db)
):
    data, content_type, filename = export_service.export_metric_boxplots_zip(
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



