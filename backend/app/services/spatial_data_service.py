from pathlib import Path

from fastapi import HTTPException, Request

from app.core.database import SessionLocal
from app.core.storage_space import DatasetSpace
from app.dataset import get_data_reader
from app.repositories.dataset_repository import get_dataset_by_id
from app.schemas.experiment import DomainComparisonItem


def _get_technology(dataset_id: str):
    db = SessionLocal()
    try:
        dataset_model = get_dataset_by_id(db, dataset_id)
        if dataset_model is None:
            raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")
        return dataset_model.technology
    finally:
        db.close()


def build_spatial_data_response(
    request_payload: DomainComparisonItem,
    http_request: Request,
) -> dict:
    technology = _get_technology(request_payload.dataset_id)
    dataset_dir = DatasetSpace(request_payload.dataset_id).dataset_path

    if not dataset_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset directory not found: {dataset_dir}",
        )

    dataset_reader = get_data_reader(technology, dataset_dir)

    space = dataset_reader.default_display_space
    coord_map = dataset_reader.read_display_coordinates(space)
    spots = [
        {"barcode": barcode, "x": x, "y": y}
        for barcode, (x, y) in coord_map.items()
    ]

    image_path, _ = dataset_reader.get_histology_image_path(space)
    image_url = None
    image_bounds = None

    if image_path is not None:
        width, height = dataset_reader.get_image_size(image_path)
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
    technology = _get_technology(dataset_id)
    dataset_dir = DatasetSpace(dataset_id).dataset_path

    if not dataset_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset directory not found: {dataset_dir}",
        )

    dataset_reader = get_data_reader(technology, dataset_dir)
    space = dataset_reader.default_display_space
    coord_map = dataset_reader.read_display_coordinates(space)
    spots = [
        {"barcode": barcode, "x": x, "y": y}
        for barcode, (x, y) in coord_map.items()
    ]

    image_path, _ = dataset_reader.get_histology_image_path(space)
    image_url = None
    image_bounds = None

    if image_path is not None:
        width, height = dataset_reader.get_image_size(image_path)
        image_bounds = [0, height, width, 0]
        image_url = _build_static_image_url(http_request, image_path)

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
        relative_path = image_path.relative_to(DatasetSpace.base_directory())
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail="Image path is outside static experiments root",
        ) from exc

    return str(http_request.url_for("datasets", path=relative_path.as_posix()))
