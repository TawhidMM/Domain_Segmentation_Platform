import tempfile
import zipfile
from pathlib import Path
from typing import List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.schemas.experiment import ExperimentRequest
from app.services.experiment_service import require_experiment_with_access
from app.services.metrics_service import (
    collect_experiment_metrics,
    METRIC_KEYS, calculate_composite_score
)
from app.services.run_service import build_run_context, require_run_with_access, check_run_finished, \
    load_prediction_file, load_embeddings_file, get_datasets_for_experiment, get_runs_for_experiment_and_dataset, \
    load_metrics_file
from app.utils.consensus import (
    align_tool_labels,
    build_label_matrix,
    compute_consensus_and_confidence
)
from app.utils.svg_export import SpatialPlotExporter, create_zip_export
from app.utils.umap_export import UmapPlotExporter
from app.visualization.metric_plots import create_metric_boxplot
from app.visualization.svg_utils import save_svg


def _build_prediction_df(
    prediction: dict,
) -> pd.DataFrame:

    spots = prediction.get("spots", [])
    domains_list = prediction.get("domains", [])

    spots_df = pd.DataFrame(spots)

    domain_colors = {d["domain_id"]: d["color"] for d in domains_list}
    spots_df["color"] = spots_df["domain"].map(domain_colors).fillna("#808080")

    return spots_df[["barcode", "domain", "color"]]


def export_spatial_plot(
    db: Session,
    run_id: str,
    token: str,
    include_metadata: bool = True,
    bundle: bool = False
) -> Tuple[bytes, str, str]:

    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)

    check_run_finished(run)

    frontend_result = load_prediction_file(run_context)

    # Extract spatial data
    spots = frontend_result.get("spots", [])
    domains = frontend_result.get("domains", [])

    # Initialize exporter
    exporter = SpatialPlotExporter(
        run_id=run_id,
        tool_name=run_context.tool_name,
        parameters=run_context.params,
        dataset_id=run_context.dataset_id
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
        zip_data = create_zip_export(run_id, svg_content, metadata)
        filename = f"run_{run_id}_export.zip"

        return zip_data, "application/zip", filename
    else:
        # Return SVG only
        svg_bytes = svg_content.encode("utf-8")
        filename = f"run_{run_id}.svg"

        return svg_bytes, "image/svg+xml", filename


def export_umap(
    db: Session,
    run_id: str,
    token: str
) -> Tuple[bytes, str, str]:

    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)

    check_run_finished(run)

    embeddings_df = load_embeddings_file(run_context)
    embeddings_df.index.name = "barcode"

    frontend_result = load_prediction_file(run_context)
    prediction_df = _build_prediction_df(frontend_result)
    prediction_df.set_index("barcode", inplace=True)

    common_barcodes = embeddings_df.index.intersection(prediction_df.index)

    embeddings_df = embeddings_df.loc[common_barcodes]
    prediction_df = prediction_df.loc[common_barcodes]

    embeddings_df.sort_index(inplace=True)
    prediction_df.sort_index(inplace=True)


    # Initialize UMAP exporter
    umap_exporter = UmapPlotExporter(
        run_id=run_id,
        tool_name=run_context.tool_name,
        parameters=run_context.params
    )

    # Generate UMAP SVG
    svg_content = umap_exporter.generate_umap_svg(
        embeddings=embeddings_df.values,
        domains=prediction_df["domain"].values,
        colors=prediction_df["color"].values,
        include_metadata=True
    )

    svg_bytes = svg_content.encode("utf-8")
    filename = f"run_{run_id}_umap.svg"

    return svg_bytes, "image/svg+xml", filename


def export_metric_boxplots_zip(
    db: Session,
    experiment_ids: List[str]
) -> Tuple[bytes, str, str]:

    experiment_metrics = collect_experiment_metrics(db, experiment_ids)

    metrics_df = _build_metrics_dataframe(experiment_metrics)

    metrics_by_experiment = _group_metrics(metrics_df)

    csv_content = metrics_df.to_csv(index=False)

    zip_bytes = _build_metric_zip(metrics_by_experiment, csv_content)

    return zip_bytes, "application/zip", "metric_boxplots.zip"




def _build_metrics_dataframe(
    experiment_metrics: dict
) -> pd.DataFrame:

    rows = []

    for experiment_id, exp_info in experiment_metrics.items():
        for run in exp_info["runs"]:
            for metric_key, metric_value in run["metrics"].items():
                rows.append({
                    "experiment_id": experiment_id,
                    "tool_name": exp_info["tool_name"],
                    "run_id": run["run_id"],
                    "metric": metric_key,
                    "value": metric_value
                })

    return pd.DataFrame(rows)


def _group_metrics(
    metrics_df: pd.DataFrame
) -> dict:

    metrics_by_experiment = {}

    for metric_key in METRIC_KEYS:
        metric_subset = metrics_df[metrics_df["metric"] == metric_key]

        grouped = (
            metric_subset
            .groupby("experiment_id")["value"]
            .apply(list)
            .to_dict()
        )

        metrics_by_experiment[metric_key] = grouped

    return metrics_by_experiment


def _build_metric_zip(
    metrics_by_experiment: dict,
    csv_content: str
) -> bytes:

    with tempfile.TemporaryDirectory(prefix="metric_boxplots_") as temp_dir:
        temp_path = Path(temp_dir)
        svg_paths: List[Path] = []

        # Generate SVG boxplots
        for metric_key in METRIC_KEYS:
            figure = create_metric_boxplot(metric_key, metrics_by_experiment[metric_key])
            svg_path = temp_path / f"{metric_key}_boxplot.svg"
            save_svg(figure, svg_path)
            plt.close(figure)
            svg_paths.append(svg_path)

        csv_path = temp_path / "metrics_all_runs.csv"
        csv_path.write_text(csv_content)

        # Create a ZIP archive with both SVGs and CSV
        zip_path = temp_path / "metric_boxplots.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            # Add SVG files
            for svg_path in svg_paths:
                archive.write(svg_path, arcname=svg_path.name)

            # Add CSV file
            archive.write(csv_path, arcname=csv_path.name)

        return zip_path.read_bytes()



# def export_compare_metrics(
#     db: Session,
#     experiments: list,
#     format_type: str = "svg"
# ) -> Tuple[bytes, str, str]:
#     """
#     Export comparison metrics across multiple runs as SVGs + CSV in ZIP.
#
#     Extracts metrics from provided runs, generates bar chart SVGs for each
#     metric, and packages with CSV export in tidy format.
#
#     Args:
#         db: Database session
#         experiments: List of {run_id, token, label (optional)}
#         format_type: "svg" (only supported format)
#
#     Returns:
#         Tuple of (zip_bytes, "application/zip", "comparison_metrics_export.zip")
#
#     Raises:
#         HTTPException(400): < 2 experiments or missing run_id
#         HTTPException(404): Run or metrics file not found
#     """
#     if format_type != "svg":
#         raise HTTPException(
#             status_code=400,
#             detail=f"Unsupported format: {format_type}. Only 'svg' is supported."
#         )
#
#     if len(experiments) < 2:
#         raise HTTPException(
#             status_code=400,
#             detail="At least two experiments are required for comparison export"
#         )
#
#     generated_at = datetime.now(timezone.utc).isoformat()
#     palette = [
#         "#2563EB",
#         "#F59E0B",
#         "#10B981",
#         "#EF4444",
#         "#8B5CF6",
#         "#0EA5E9",
#         "#F97316",
#         "#14B8A6"
#     ]
#
#     metric_keys = [
#         (
#             key,
#             METRICS[key]["label"],
#             f"{METRICS[key]['direction']} is better"
#         )
#         for key in METRIC_KEYS
#     ]
#
#     run_ids = []
#     labels = []
#     rows = []
#
#     # Load metrics for each provided run
#     for item in experiments:
#         run_id = item.get("run_id")
#         token = item.get("token")
#         label = item.get("label")
#
#         if not run_id:
#             raise HTTPException(status_code=400, detail="run_id is required")
#
#         # TODO: refactor this to use require_run_with_access for validation
#         run_context = build_run_context(db, None)
#         metrics_path = run_context.metrics_file
#
#         if not metrics_path.exists():
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Metrics not ready for run {run_id}"
#             )
#
#         metrics = canonicalize_metrics(json.loads(metrics_path.read_text()), run_id)
#
#         row = {
#             "run_id": run_id,
#             "label": label or run_id[:8],
#             "silhouette": metrics["silhouette"],
#             "davies_bouldin": metrics["davies_bouldin"],
#             "calinski_harabasz": metrics["calinski_harabasz"],
#             "moran_i": metrics["moran_i"],
#             "geary_c": metrics["geary_c"]
#         }
#
#         run_ids.append(run_id)
#         labels.append(row["label"])
#         rows.append(row)
#
#     # Generate SVGs for each metric
#     colors = [palette[i % len(palette)] for i in range(len(run_ids))]
#
#     svg_map = {}
#     for metric_key, metric_label, note in metric_keys:
#         values = [row[metric_key] for row in rows]
#         svg_map[f"{metric_key}.svg"] = generate_metric_svg(
#             metric_key=metric_key,
#             metric_label=metric_label,
#             values=values,
#             labels=labels,
#             colors=colors,
#             experiment_ids=run_ids,
#             generated_at=generated_at,
#             note=note
#         )
#
#     # Build CSV
#     csv_buffer = StringIO()
#     writer = csv.writer(csv_buffer)
#     writer.writerow([
#         "run_id",
#         "label",
#         "silhouette",
#         "davies_bouldin",
#         "calinski_harabasz",
#         "moran_i",
#         "geary_c"
#     ])
#     for row in rows:
#         writer.writerow([
#             row["run_id"],
#             row["label"],
#             row["silhouette"],
#             row["davies_bouldin"],
#             row["calinski_harabasz"],
#             row["moran_i"],
#             row["geary_c"]
#         ])
#
#     # Package SVGs and CSV in ZIP
#     zip_data = create_metrics_zip_export(svg_map, csv_buffer.getvalue())
#     filename = "comparison_metrics_export.zip"
#     return zip_data, "application/zip", filename


def _load_experiment_data(
    db: Session,
    experiment_req: ExperimentRequest
) -> list[dict]:

    require_experiment_with_access(db, experiment_req.experiment_id, experiment_req.token)
    datasets = get_datasets_for_experiment(db, experiment_req.experiment_id)
    dataset_id = datasets[0]

    runs = get_runs_for_experiment_and_dataset(db, experiment_req.experiment_id, dataset_id)

    runs_data = []
    for run in runs:
        run_context = build_run_context(db, run)

        result_json = load_prediction_file(run_context)
        spots_df = pd.DataFrame(result_json["spots"])
        spots_df = spots_df[["barcode", "x", "y", "domain"]]

        metrics = load_metrics_file(run_context)

        runs_data.append({
            "run_id": run.id,
            "spots_df": spots_df,
            "metrics": metrics
        })

    return runs_data


# def _load_experiments_data(
#     db: Session,
#     experiments: List[ExperimentRequest]
# ) -> List[dict]:
#     """
#     Load all experiments with runs data converted to DataFrames.
#
#     Returns:
#         List of {
#             experiment_id: str,
#             tool_name: str,
#             runs: [{
#                 run_id: str,
#                 spots_df: pd.DataFrame (barcode, x, y, domain),
#                 metrics: dict
#             }]
#         }
#     """
#     return [
#         _load_experiment_data(db, exp_item.experiment_id, exp_item.token)
#         for exp_item in experiments
#     ]


def _save_experiment_consensus_json(
    experiment_req: ExperimentRequest,
    consensus_df: pd.DataFrame
) -> None:
    """
    Placeholder for consensus persistence.

    TODO: implement JSON save flow once storage contract is finalized.
    """
    pass


def build_consensus_predictions(
    db: Session,
    experiments: List[ExperimentRequest]
) -> dict:

    experiment_consensuses = []
    for exp_item in experiments:

        runs_data = _load_experiment_data(db, exp_item)

        consensus_df = _load_experiment_consensus(db, exp_item, runs_data)

        mean_metric_score = _compute_mean_metric_score(runs_data)

        experiment_consensuses.append(
            {
                "experiment_id": exp_item.experiment_id,
                "consensus_df": consensus_df,
                "mean_metric_score": mean_metric_score
            }
        )

    # Compute global consensus across experiments
    final_consensus = _compute_global_consensus(experiment_consensuses)

    # Convert to output format
    spots_output = final_consensus["spots_df"].to_dict(orient="records")

    return {
        "metadata": {
            "num_experiments": len(experiment_consensuses),
            "reference_experiment_id": final_consensus["reference_experiment_id"],
            "num_spots": len(spots_output)
        },
        "spots": spots_output
    }


def _load_experiment_consensus(
    db: Session,
    experiment_req: ExperimentRequest,
    runs_data: list[dict]
) -> pd.DataFrame:


    return compute_experiment_consensus(experiment_req, runs_data)


def compute_experiment_consensus(
    experiment_req: ExperimentRequest,
    runs_data: list[dict]
) -> pd.DataFrame:

    # Extract DataFrames with barcode and domain columns
    run_dfs = [run["spots_df"] for run in runs_data]

    # Build label matrix for all runs
    labels_matrix, common_barcodes = build_label_matrix(run_dfs)

    # Select reference run using composite scoring
    reference_idx = _select_reference_run(runs_data)

    consensus_labels, _ = _compute_consensus(
        labels_matrix=labels_matrix,
        reference_idx=reference_idx
    )

    # carry x, y from the reference run
    reference_spots_df = runs_data[reference_idx]["spots_df"].set_index("barcode")
    xy = reference_spots_df.loc[common_barcodes, ["x", "y"]]

    experiment_consensus_df = pd.DataFrame({
        "barcode": common_barcodes,
        "x": xy["x"].values,
        "y": xy["y"].values,
        "domain": consensus_labels
    })

    _save_experiment_consensus_json(experiment_req, experiment_consensus_df)

    return experiment_consensus_df


def _select_reference_run(
    runs: list
) -> int:

    scores = []
    for run in runs:
        metrics_with_score = calculate_composite_score(run["metrics"])

        scores.append(metrics_with_score["composite_score"])

    return int(np.argmax(scores))


def _compute_mean_metric_score(
    runs: list
) -> float:

    scores = []
    for run in runs:
        metrics_with_score = calculate_composite_score(run["metrics"])

        scores.append(metrics_with_score["composite_score"])

    return float(np.mean(scores))


def _compute_global_consensus(
    experiment_consensuses: list
) -> dict:

    # Find intersection of barcodes across all experiments
    barcode_sets = [set(exp["consensus_df"]["barcode"]) for exp in experiment_consensuses]
    common_barcodes = sorted(list(set.intersection(*barcode_sets)))

    # Build experiment-level label matrix using pandas
    experiment_labels_matrix = []
    for exp in experiment_consensuses:
        # Align to common barcodes
        consensus_df = exp["consensus_df"].set_index("barcode").loc[common_barcodes]
        labels = consensus_df["domain"].to_numpy().astype(int)
        experiment_labels_matrix.append(labels)

    experiment_labels_matrix = np.array(experiment_labels_matrix)

    # Select a reference experiment (highest mean metric score)
    mean_scores = np.asarray(
        [exp["mean_metric_score"] for exp in experiment_consensuses],
        dtype=float
    )
    reference_idx = int(np.argmax(mean_scores))

    final_labels, final_confidence = _compute_consensus(
        labels_matrix=experiment_labels_matrix,
        reference_idx=reference_idx
    )

    # Take x, y from the reference experiment's consensus DataFrame
    reference_consensus_df = (
        experiment_consensuses[reference_idx]["consensus_df"]
        .set_index("barcode")
        .loc[common_barcodes]
    )

    consensus_df = pd.DataFrame({
        "barcode": common_barcodes,
        "x": reference_consensus_df["x"].values,
        "y": reference_consensus_df["y"].values,
        "consensus_domain": final_labels,
        "confidence": final_confidence
    })

    return {
        "spots_df": consensus_df,
        "reference_experiment_id": experiment_consensuses[reference_idx]["experiment_id"]
    }



def _compute_consensus(
    labels_matrix: np.ndarray,
    reference_idx: int
) -> tuple[np.ndarray, np.ndarray]:

    reference_labels = labels_matrix[reference_idx]

    aligned_labels = []

    for idx, labels in enumerate(labels_matrix):
        if idx == reference_idx:
            aligned_labels.append(labels)
        else:
            aligned_labels.append(
                align_tool_labels(reference_labels, labels)
            )

    aligned_stack = np.vstack(aligned_labels)

    return compute_consensus_and_confidence(
        aligned_stack,
        reference_labels
    )