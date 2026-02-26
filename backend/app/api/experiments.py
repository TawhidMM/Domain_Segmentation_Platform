import base64
import json
from typing import Any, List
from urllib.parse import unquote
from fastapi import APIRouter, Form, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.core.database import get_db
from app.schemas.experiment import (
    ExperimentSubmitResponse,
    ExperimentStatusResponse
)
from app.services import experiment_service
from app.tasks.experiment_tasks import run_experiment_task



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
                {"job_id": job_id, "token": token}
                for job_id, token in zip(jobs, tokens)
            ]
        elif "jobIds" in payload and "tokens" in payload:
            jobs = payload.get("jobIds") or []
            tokens = payload.get("tokens") or []
            items = [
                {"job_id": job_id, "token": token}
                for job_id, token in zip(jobs, tokens)
            ]
        else:
            items = [payload]
    else:
        raise HTTPException(status_code=400, detail="Invalid comparison payload format")

    normalized = []
    for item in items:
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail="Invalid experiment item in payload")

        job_id = item.get("job_id") or item.get("jobId") or item.get("id")
        token = item.get("token") or item.get("access_token")
        label = item.get("label") or item.get("name")

        if not job_id or not token:
            raise HTTPException(status_code=400, detail="Experiment item missing job_id or token")

        normalized.append({"job_id": job_id, "token": token, "label": label})

    return normalized





@router.post("/submit", response_model=ExperimentSubmitResponse)
async def submit_experiment(
    dataset_id: str = Form(...),
    tool_name: str = Form(...),
    params: str = Form(...),
    db: Session = Depends(get_db)
):

    try:
        params_dict = json.loads(params)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid params JSON")

    job_id, access_token = experiment_service.create_experiment_record(
        db=db,
        dataset_id=dataset_id,
        tool_name=tool_name,
        params_dict=params_dict
    )

    run_experiment_task.delay(
        job_id=job_id,
        tool_name=tool_name,
        params_dict=params_dict,
        dataset_id=dataset_id
    )

    return ExperimentSubmitResponse(
        job_id=job_id,
        access_token=access_token,
        status="queued"
    )


@router.get("/jobs/{job_id}", response_model=ExperimentStatusResponse)
def get_experiment_status(
    job_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):

    experiment = (experiment_service.
                  require_experiment_with_access(db, job_id, token))

    return ExperimentStatusResponse(
        job_id=experiment.id,
        status=experiment.status.value,
        tool_name=experiment.tool_name,
        started_at=experiment.started_at,
        finished_at=experiment.finished_at
    )


@router.get("/result/{job_id}")
def get_result(
    job_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):

    return experiment_service.get_result_json(db, job_id, token)


@router.get("/metrics/{job_id}")
def get_metrics(
    job_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):

    return experiment_service.get_metrics_json(db, job_id, token)


@router.get("/export/{job_id}")
def export_experiment(
    job_id: str,
    token: str = Query(...),
    format: str = Query("svg"),
    include_metadata: bool = Query(True),
    bundle: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Export spatial plot as SVG."""
    if format != "svg":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {format}. Currently only 'svg' is supported."
        )

    data, content_type, filename = experiment_service.export_experiment(
        db=db,
        job_id=job_id,
        token=token,
        format_type=format,
        include_metadata=include_metadata,
        bundle=bundle
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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

    data, content_type, filename = experiment_service.export_compare_metrics(
        db=db,
        experiments=items,
        format_type=format
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/compare/consensus")
def get_consensus_predictions(
    c: str = Query(...),
    db: Session = Depends(get_db)
):
    print(" [[[]]][[[[]]][[[]]]][[[[]]]")
    payload = _decode_compare_payload(c)
    items = _extract_compare_items(payload)

    return experiment_service.build_consensus_predictions(
        db=db,
        experiments=items
    )


@router.get("/{experiment_id}/export/umap")
def export_umap(
    experiment_id: str,
    token: str = Query(...),
    format: str = Query("svg"),
    db: Session = Depends(get_db)
):

    if format != "svg":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {format}. Only 'svg' is supported."
        )

    data, content_type, filename = experiment_service.export_experiment_umap(
        db=db,
        job_id=experiment_id,
        token=token
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



