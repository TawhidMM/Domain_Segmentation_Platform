from pathlib import Path

from fastapi import HTTPException, Request

from app.core.config import settings
from app.core.workspace import ExperimentWorkspace
from app.schemas.experiment import DomainComparisonItem
from app.utils.visium import (
    VisiumDataset,
)


def build_spatial_data_response(
    request_payload: DomainComparisonItem,
    http_request: Request,
) -> dict:
    visium_dataset = VisiumDataset()

    experiment_workspace = ExperimentWorkspace(request_payload.experiment_id)

    dataset_dir = experiment_workspace.dataset_dir(request_payload.dataset_id)
    if not dataset_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset directory not found: {dataset_dir}",
        )

    try:
        spatial_dir = visium_dataset.resolve_spatial_dir(dataset_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        scale_factors = visium_dataset.read_scale_factors(spatial_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        coords_file = visium_dataset.resolve_coordinates_file(spatial_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    coord_map = visium_dataset.read_coordinates(coords_file, scale_factors)
    spots = [
        {"barcode": barcode, "x": x, "y": y}
        for barcode, (x, y) in coord_map.items()
    ]

    image_path, _ = visium_dataset.get_histology_image_path(spatial_dir)
    image_url = None
    image_bounds = None

    if image_path is not None:
        width, height = visium_dataset.get_image_size(image_path)
        image_bounds = [0, height, width, 0]
        image_url = _build_static_image_url(http_request, image_path)

    return {
        "experiment_id": request_payload.experiment_id,
        "dataset_id": request_payload.dataset_id,
        "image_url": image_url,
        "image_bounds": image_bounds,
        "spots": spots,
    }


def build_spatial_data_response_from_dataset(
    dataset_id: str,
    http_request: Request,
) -> dict:
    visium_dataset = VisiumDataset()


    dataset_dir = settings.UPLOAD_ROOT / f"upload_{dataset_id}" / "extracted"

    print(dataset_dir)

    if not dataset_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset directory not found: {dataset_dir}",
        )

    try:
        spatial_dir = visium_dataset.resolve_spatial_dir(dataset_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        scale_factors = visium_dataset.read_scale_factors(spatial_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    try:
        coords_file = visium_dataset.resolve_coordinates_file(spatial_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    print("all files read")

    coord_map = visium_dataset.read_coordinates(coords_file, scale_factors)
    spots = [
        {"barcode": barcode, "x": x, "y": y}
        for barcode, (x, y) in coord_map.items()
    ]

    print("spots ready")

    image_path, _ = visium_dataset.get_histology_image_path(spatial_dir)
    image_url = None
    image_bounds = None

    print("image path ready")

    if image_path is not None:
        width, height = visium_dataset.get_image_size(image_path)
        image_bounds = [0, height, width, 0]
        image_url = _build_static_image_url(http_request, image_path)

    print("all done")

    return {
        "dataset_id": dataset_id,
        "image_url": image_url,
        "image_bounds": image_bounds,
        "spots": spots,
    }


def _build_static_image_url(
    http_request: Request,
    image_path: Path
) -> str:
    try:
        relative_path = image_path.relative_to(settings.UPLOAD_ROOT)
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail="Image path is outside static experiments root",
        ) from exc

    return str(http_request.url_for("datasets", path=relative_path.as_posix()))
