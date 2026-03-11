import base64
import json
from io import BytesIO
from typing import Any, List, Optional
from urllib.parse import unquote

from fastapi import APIRouter, Form, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories import run_repository
from app.schemas.experiment import (
    CompareBoxplotsDownloadRequest,
    ConsensusRequest,
    ExperimentSubmitResponse,
    ExperimentStatusResponse
)
from app.services import experiment_service
from app.services import metrics_service
from app.services import export_service
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
    dataset_id: str = Form(...),
    tool_name: str = Form(...),
    params: str = Form(...),
    number_of_runs: int = Form(1),
    seed_list: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):

    try:
        params_dict = json.loads(params)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid params JSON")

    # Parse seed_list if provided
    parsed_seed_list = None
    if seed_list:
        try:
            parsed_seed_list = json.loads(seed_list)
            if not isinstance(parsed_seed_list, list):
                raise HTTPException(status_code=400, detail="seed_list must be a JSON array")
            if not all(isinstance(s, int) for s in parsed_seed_list):
                raise HTTPException(status_code=400, detail="All seeds must be integers")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid seed_list JSON")

    experiment_id, access_token = experiment_service.create_experiment_record(
        db=db,
        dataset_id=dataset_id,
        tool_name=tool_name,
        params_dict=params_dict,
        number_of_runs=number_of_runs,
        seed_list=parsed_seed_list
    )

    runs = run_repository.get_runs_by_experiment(db, experiment_id)
    for run in runs:
        run_task.delay(run.id)

    return ExperimentSubmitResponse(
        experiment_id=experiment_id,
        access_token=access_token,
        status="queued"
    )


@router.get("/{experiment_id}", response_model=ExperimentStatusResponse)
def get_experiment_status(
    experiment_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):

    response_data = experiment_service.build_nested_experiment_response(db, experiment_id, token)

    return ExperimentStatusResponse(**response_data)


@router.get("/{experiment_id}/best-run")
def get_best_run_result(
    experiment_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    best_run_context = metrics_service.select_best_run_for_experiment(db, experiment_id, token)

    result = json.loads(best_run_context.result_file.read_text())

    return result


@router.get("/{experiment_id}/run-metrics")
def get_experiment_run_metrics(
    experiment_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):

    return metrics_service.get_experiment_run_metrics(db, experiment_id, token)


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
    request: ConsensusRequest,
    db: Session = Depends(get_db)
):
    return export_service.build_consensus_predictions(
        db=db,
        experiments=request.experiments
    )


@router.post("/compare/download-boxplots")
def download_compare_boxplots(
    request: CompareBoxplotsDownloadRequest,
    db: Session = Depends(get_db)
):
    data, content_type, filename = export_service.export_metric_boxplots_zip(
        db=db,
        experiment_ids=request.experiment_ids
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



