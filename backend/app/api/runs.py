from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.experiment import RunStatusResponse
from app.services import run_service
from app.services import export_service
from app.services.run_service import require_run_with_access

router = APIRouter()


@router.get("/{run_id}", response_model=RunStatusResponse)
def get_run_status(
    run_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    run = require_run_with_access(db, run_id, token)

    return RunStatusResponse(
        run_id=run.id,
        status=run.status.value,
        started_at=run.started_at,
        finished_at=run.finished_at
    )


@router.get("/{run_id}/result")
def get_result(
    run_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    return run_service.get_prediction_json(db, run_id, token)


@router.get("/{run_id}/metrics")
def get_metrics(
    run_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    return run_service.get_metrics_json(db, run_id, token)


@router.get("/{run_id}/export")
def export_experiment(
    run_id: str,
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

    data, content_type, filename = export_service.export_spatial_plot(
        db=db,
        run_id=run_id,
        token=token,
        include_metadata=include_metadata,
        bundle=bundle
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{run_id}/export/umap")
def export_umap(
    run_id: str,
    token: str = Query(...),
    format: str = Query("svg"),
    db: Session = Depends(get_db)
):
    if format != "svg":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {format}. Only 'svg' is supported."
        )

    data, content_type, filename = export_service.export_umap(
        db=db,
        run_id=run_id,
        token=token
    )

    return StreamingResponse(
        BytesIO(data),
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
