import csv
import json
import uuid
from datetime import datetime, timezone
from io import StringIO
from typing import Optional, Tuple
import pandas as pd
import numpy as np
from fastapi import HTTPException

from app.core.workspace import Workspace
from app.models.experiment import Experiment, ExperimentStatus, VALID_EXPERIMENT_TRANSITIONS
from app.repositories import dataset_repository, experiment_repository
from app.utils.security import generate_token_pair, verify_token
from app.utils.metrics_export import create_metrics_zip_export, generate_metric_svg
from app.utils.svg_export import SpatialPlotExporter, create_zip_export
from app.utils.umap_export import UmapPlotExporter


def require_dataset(db, dataset_id: str):
    dataset = dataset_repository.get_dataset_by_id(db, dataset_id)
    if not dataset:
        raise HTTPException(400, "Dataset not found or not finalized")
    return dataset


def create_experiment_record(
    db,
    dataset_id: str,
    tool_name: str,
    params_dict: dict
) -> Tuple[str, str]:

    require_dataset(db, dataset_id)

    job_id = str(uuid.uuid4())
    access_token, token_hash = generate_token_pair()

    workspace = Workspace(job_id)

    experiment = Experiment(
        id=job_id,
        dataset_id=dataset_id,
        tool_name=tool_name,
        params_json=params_dict,
        workspace_path=str(workspace.root_dir),
        status=ExperimentStatus.QUEUED,
        access_token_hash=token_hash,
        started_at=None,
        finished_at=None
    )

    experiment_repository.create_experiment(db, experiment)

    return job_id, access_token


def require_experiment_with_access(
    db,
    job_id: str,
    token: str
) -> Experiment:

    experiment = experiment_repository.get_experiment_by_id(db, job_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if not verify_token(token, experiment.access_token_hash):
        raise HTTPException(status_code=403, detail="Invalid access token")

    return experiment


def update_experiment_status(
    db,
    job_id: str,
    status: ExperimentStatus,
    started_at: Optional[datetime] = None,
    finished_at: Optional[datetime] = None
) -> Optional[Experiment]:

    experiment = experiment_repository.get_experiment_by_id(db, job_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if experiment.status != status:
        if status not in VALID_EXPERIMENT_TRANSITIONS[experiment.status]:
            raise ValueError("Invalid status transition")


    return experiment_repository.update_status(
        db,
        job_id,
        status,
        started_at=started_at,
        finished_at=finished_at
    )


def mark_running(
    db,
    job_id: str
) -> Optional[Experiment]:

    return update_experiment_status(
        db,
        job_id,
        ExperimentStatus.RUNNING,
        started_at=datetime.now(timezone.utc)
    )


def mark_finished(
    db,
    job_id: str
) -> Optional[Experiment]:

    return update_experiment_status(
        db,
        job_id,
        ExperimentStatus.FINISHED,
        finished_at=datetime.now(timezone.utc)
    )


def mark_failed(
    db,
    job_id: str
) -> Optional[Experiment]:

    return update_experiment_status(
        db,
        job_id,
        ExperimentStatus.FAILED,
        finished_at=datetime.now(timezone.utc)
    )


def get_result_json(
    db,
    job_id: str,
    token: str
) -> dict:

    experiment = require_experiment_with_access(db, job_id, token)

    if experiment.status != ExperimentStatus.FINISHED:
        raise HTTPException(
            status_code=422,
            detail=f"Experiment is {experiment.status.value}, not finished"
        )

    workspace = Workspace(job_id)
    result_path = workspace.result_file

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")

    result = json.loads(result_path.read_text())
    
    # Ensure toolName is always included (backward compatibility)
    if "toolName" not in result and experiment.tool_name:
        result["toolName"] = experiment.tool_name
    
    return result


def get_metrics_json(
    db,
    job_id: str,
    token: str
) -> dict:

    require_experiment_with_access(db, job_id, token)

    workspace = Workspace(job_id)
    metrics_path = workspace.metrics_file

    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Metrics not ready")

    return json.loads(metrics_path.read_text())


def export_experiment(
    db,
    job_id: str,
    token: str,
    format_type: str = "svg",
    include_metadata: bool = True,
    bundle: bool = False
) -> Tuple[bytes, str, str]:

    experiment = require_experiment_with_access(db, job_id, token)

    # Ensure experiment is finished
    if experiment.status != ExperimentStatus.FINISHED:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot export: experiment is {experiment.status.value}"
        )

    # Load frontend result
    workspace = Workspace(job_id)
    result_path = workspace.result_file

    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")

    frontend_result = json.loads(result_path.read_text())

    # Extract spatial data
    spots = frontend_result.get("spots", [])
    domains = frontend_result.get("domains", [])

    # Initialize exporter
    exporter = SpatialPlotExporter(
        job_id=job_id,
        tool_name=experiment.tool_name,
        parameters=experiment.params_json,
        dataset_id=experiment.dataset_id,
        created_at=experiment.started_at or experiment.finished_at or datetime.now(timezone.utc),
        backend_version="1.0.0"
    )

    # Generate SVG
    svg_content = exporter.generate_svg(
        spots=spots,
        domains=domains,
        include_metadata=include_metadata
    )

    # Return appropriate format
    if bundle and include_metadata:
        metadata = exporter.generate_metadata_json()
        zip_data = create_zip_export(job_id, svg_content, metadata)
        filename = f"experiment_{job_id}_export.zip"
        return zip_data, "application/zip", filename
    else:
        # Return SVG only
        svg_bytes = svg_content.encode("utf-8")
        filename = f"experiment_{job_id}.svg"
        return svg_bytes, "image/svg+xml", filename


def export_experiment_umap(
    db,
    job_id: str,
    token: str
) -> Tuple[bytes, str, str]:

    experiment = require_experiment_with_access(db, job_id, token)

    # Ensure experiment is finished
    if experiment.status != ExperimentStatus.FINISHED:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot export: experiment is {experiment.status.value}"
        )

    workspace = Workspace(job_id)

    # Check if embeddings.csv exists
    embeddings_path = workspace.embeddings_file
    if not embeddings_path.exists():
        raise HTTPException(status_code=404, detail="Embeddings file not found")

    # Check if frontend_result.json exists
    result_path = workspace.result_file
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Result file not found")

    # Load embeddings
    try:
        embeddings_df = pd.read_csv(embeddings_path, sep=",", index_col=0)
        embeddings = embeddings_df.values
        embedding_barcodes = np.array(embeddings_df.index)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load embeddings: {str(e)}")

    # Load frontend result
    try:
        frontend_result = json.loads(result_path.read_text())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load result: {str(e)}")

    # Extract spots and domain info
    spots = frontend_result.get("spots", [])
    domains_list = frontend_result.get("domains", [])

    if not spots or not domains_list:
        raise HTTPException(status_code=422, detail="Result lacks spots or domains")

    # Build domain color mapping
    domain_colors = {d["domain_id"]: d["color"] for d in domains_list}

    # Build barcode → domain mapping
    barcode_to_domain = {}
    for spot in spots:
        barcode = spot.get("barcode")
        domain_id = spot.get("domain")
        color = domain_colors.get(domain_id, "#808080")
        barcode_to_domain[barcode] = {
            "domain_id": domain_id,
            "color": color
        }

    # Sort embedding barcodes deterministically
    embedding_barcodes_sorted = np.sort(embedding_barcodes)

    # Align embeddings with spots
    valid_idx = []
    valid_barcodes = []
    for i, bc in enumerate(embedding_barcodes):
        if bc in barcode_to_domain:
            valid_idx.append(i)
            valid_barcodes.append(bc)

    if not valid_idx:
        raise HTTPException(status_code=422, detail="No matching barcodes between embeddings and spots")

    # Extract aligned embeddings
    aligned_embeddings = embeddings[valid_idx]
    aligned_domains = {bc: barcode_to_domain[bc] for bc in valid_barcodes}

    # Initialize UMAP exporter
    umap_exporter = UmapPlotExporter(
        job_id=job_id,
        tool_name=experiment.tool_name,
        parameters=experiment.params_json,
        dataset_id=experiment.dataset_id,
        created_at=experiment.started_at or experiment.finished_at or datetime.now(timezone.utc),
        backend_version="1.0.0"
    )

    # Generate UMAP SVG
    svg_content = umap_exporter.generate_umap_svg(
        embeddings=aligned_embeddings,
        barcodes=np.array(valid_barcodes),
        domains=aligned_domains,
        include_metadata=True
    )

    svg_bytes = svg_content.encode("utf-8")
    filename = f"experiment_{job_id}_umap.svg"
    return svg_bytes, "image/svg+xml", filename


def _extract_metric_value(metrics: dict, job_id: str, key: str) -> float:
    key_map = {
        "silhouette": ["silhouette"],
        "davies_bouldin": ["davies_bouldin", "davies-bouldin"],
        "calinski_harabasz": ["calinski_harabasz", "calinski-harabasz"],
        "moran_i": ["moran_i", "morans_I", "morans_i"],
        "geary_c": ["geary_c", "gearys_C", "gearys_c"]
    }

    for candidate in key_map.get(key, []):
        if candidate in metrics:
            return metrics[candidate]

    raise HTTPException(
        status_code=422,
        detail=f"Metric '{key}' missing for experiment {job_id}"
    )


def export_compare_metrics(
    db,
    experiments: list,
    format_type: str = "svg"
) -> Tuple[bytes, str, str]:

    if format_type != "svg":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {format_type}. Only 'svg' is supported."
        )

    if len(experiments) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two experiments are required for comparison export"
        )

    backend_version = "1.0.0"
    generated_at = datetime.now(timezone.utc).isoformat()
    palette = [
        "#2563EB",
        "#F59E0B",
        "#10B981",
        "#EF4444",
        "#8B5CF6",
        "#0EA5E9",
        "#F97316",
        "#14B8A6"
    ]

    metric_keys = [
        ("silhouette", "Silhouette", "higher is better"),
        ("davies_bouldin", "Davies-Bouldin", "lower is better"),
        ("calinski_harabasz", "Calinski-Harabasz", "higher is better"),
        ("moran_i", "Moran's I", "higher is better"),
        ("geary_c", "Geary's C", "lower is better")
    ]

    experiment_ids = []
    labels = []
    rows = []

    for item in experiments:
        job_id = item.get("job_id")
        token = item.get("token")
        label = item.get("label")

        experiment = require_experiment_with_access(db, job_id, token)
        workspace = Workspace(job_id)
        metrics_path = workspace.metrics_file

        if not metrics_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Metrics not ready for experiment {job_id}"
            )

        metrics = json.loads(metrics_path.read_text())

        row = {
            "experiment_id": job_id,
            "label": label or job_id[:8],
            "silhouette": _extract_metric_value(metrics, job_id, "silhouette"),
            "davies_bouldin": _extract_metric_value(metrics, job_id, "davies_bouldin"),
            "calinski_harabasz": _extract_metric_value(metrics, job_id, "calinski_harabasz"),
            "moran_i": _extract_metric_value(metrics, job_id, "moran_i"),
            "geary_c": _extract_metric_value(metrics, job_id, "geary_c")
        }

        experiment_ids.append(experiment.id)
        labels.append(row["label"])
        rows.append(row)

    colors = [palette[i % len(palette)] for i in range(len(experiment_ids))]

    svg_map = {}
    for metric_key, metric_label, note in metric_keys:
        values = [row[metric_key] for row in rows]
        svg_map[f"{metric_key}.svg"] = generate_metric_svg(
            metric_key=metric_key,
            metric_label=metric_label,
            values=values,
            labels=labels,
            colors=colors,
            experiment_ids=experiment_ids,
            generated_at=generated_at,
            backend_version=backend_version,
            note=note
        )

    csv_buffer = StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow([
        "experiment_id",
        "label",
        "silhouette",
        "davies_bouldin",
        "calinski_harabasz",
        "moran_i",
        "geary_c"
    ])
    for row in rows:
        writer.writerow([
            row["experiment_id"],
            row["label"],
            row["silhouette"],
            row["davies_bouldin"],
            row["calinski_harabasz"],
            row["moran_i"],
            row["geary_c"]
        ])

    zip_data = create_metrics_zip_export(svg_map, csv_buffer.getvalue())
    filename = "comparison_metrics_export.zip"
    return zip_data, "application/zip", filename

