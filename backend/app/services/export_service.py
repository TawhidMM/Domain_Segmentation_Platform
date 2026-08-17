import json
import tempfile
import zipfile
from pathlib import Path
from typing import List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.core.workspace import ExperimentWorkspace
from app.repositories.dataset_repository import get_datasets_by_ids
from app.schemas.comparison import ComparisonMetricsRequest, ComparisonRequest, ExperimentContext
from app.services.experiment_service import require_experiment_with_access
from app.services.metrics_service import (
    collect_experiment_metrics,
    METRIC_KEYS, calculate_composite_score
)
from app.services.run_service import build_run_context, require_run_with_access, check_run_finished, \
    load_prediction_file, load_embeddings_file, get_runs_for_experiment_and_dataset, \
    load_metrics_file
from app.utils.consensus import (
    align_tool_labels,
    build_label_matrix,
    compute_consensus_and_confidence
)
from app.visualization.plot_export import (
    export_spatial_plot_svg,
    export_umap_svg,
    create_zip_export
)
from app.visualization.metric_plots import create_metric_barplot, create_metric_boxplot
from app.visualization.plot_style import build_global_color_map
from app.visualization.svg_utils import save_svg, save_as_pdf


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
    include_metadata: bool = True
) -> Tuple[bytes, str, str]:

    run = require_run_with_access(db, run_id, token)
    run_context = build_run_context(db, run)

    check_run_finished(run)

    frontend_result = load_prediction_file(run_context)

    # Extract spatial data
    spots = frontend_result.get("spots", [])
    domains = frontend_result.get("domains", [])

    # Generate SVG + PDF bytes
    svg_content, pdf_bytes, metadata = export_spatial_plot_svg(
        run_id=run_id,
        tool_name=run_context.tool_name,
        parameters=run_context.params,
        dataset_id=run_context.dataset_id,
        spots=spots,
        domains=domains,
        include_metadata=include_metadata
    )

    zip_data = create_zip_export(svg_content=svg_content, pdf_bytes=pdf_bytes, filename=f"prediction_{run_id}")
    filename = f"prediction_{run_id}_export.zip"

    return zip_data, "application/zip", filename


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


    # Generate UMAP SVG + PDF bytes
    svg_content, pdf_bytes, metadata = export_umap_svg(
        run_id=run_id,
        tool_name=run_context.tool_name,
        parameters=run_context.params,
        embeddings=embeddings_df.values,
        domains=prediction_df["domain"].values,
        colors=prediction_df["color"].values,
        include_metadata=True
    )

    zip_data = create_zip_export(svg_content=svg_content, pdf_bytes=pdf_bytes, filename=f"umap_{run_id}")
    filename = f"umap_{run_id}_export.zip"

    return zip_data, "application/zip", filename


def export_metric_zip(
    db: Session,
    request: ComparisonMetricsRequest
) -> Tuple[bytes, str, str]:

    experiment_metrics = collect_experiment_metrics(db, request)

    metrics_df = _build_metrics_dataframe(db, experiment_metrics)

    metrics_by_experiment = _group_metrics(metrics_df)

    csv_columns = ["tool_name", "dataset_name", "seed", "metric", "value"]
    csv_content = metrics_df[csv_columns].to_csv(index=False)

    label_map = {
        experiment_id: exp_info["tool_name"]
        for experiment_id, exp_info in experiment_metrics.items()
    }
    color_map = build_global_color_map(list(label_map.values()))

    # Box plots require >1 value per experiment (runs across all datasets). When
    # every experiment has exactly one run, a single-point box would be
    # meaningless, so export bar plots instead (same publication style, same
    # global color map).
    run_counts = [
        len(exp_info.get("runs") or [])
        for exp_info in experiment_metrics.values()
    ]
    use_box_plots = not all(count <= 1 for count in run_counts)

    zip_bytes = _build_metric_zip(
        metrics_by_experiment, csv_content, label_map, color_map, use_box_plots
    )

    return zip_bytes, "application/zip", "metric_boxplots.zip"




def _build_metrics_dataframe(
    db: Session,
    experiment_metrics: dict
) -> pd.DataFrame:

    rows = []

    # Batch-load dataset names for all referenced datasets to avoid N+1 queries.
    dataset_ids = {
        run["dataset_id"]
        for exp_info in experiment_metrics.values()
        for run in exp_info["runs"]
    }
    dataset_names = {
        ds.dataset_id: (ds.dataset_name or ds.dataset_id)
        for ds in get_datasets_by_ids(db, list(dataset_ids))
    }

    for experiment_id, exp_info in experiment_metrics.items():
        for run in exp_info["runs"]:
            dataset_name = dataset_names.get(run["dataset_id"], run["dataset_id"])
            for metric_key, metric_value in run["metrics"].items():
                rows.append({
                    "tool_name": exp_info["tool_name"],
                    "dataset_name": dataset_name,
                    "seed": run.get("seed"),
                    "metric": metric_key,
                    "value": metric_value,
                    # experiment_id is kept internally for boxplot grouping only.
                    "experiment_id": experiment_id,
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
    csv_content: str,
    label_map: dict,
    color_map: dict,
    use_box_plots: bool = True,
) -> bytes:

    with tempfile.TemporaryDirectory(prefix="metric_box_plots_") as temp_dir:
        temp_path = Path(temp_dir)
        plot_paths: List[Path] = []

        for metric_key in METRIC_KEYS:
            metric_values = metrics_by_experiment.get(metric_key) or {}

            if not metric_values:
                continue

            plot_kind = "boxplot" if use_box_plots else "barplot"

            if use_box_plots:
                figure = create_metric_boxplot(
                    metric_key, metric_values, label_map, color_map,
                )
            else:
                figure = create_metric_barplot(
                    metric_key, metric_values, label_map, color_map,
                )

            svg_path = temp_path / f"{metric_key}_{plot_kind}.svg"
            pdf_path = temp_path / f"{metric_key}_{plot_kind}.pdf"

            save_svg(figure, svg_path)
            pdf_path.write_bytes(save_as_pdf(figure))

            plt.close(figure)
            plot_paths.extend([svg_path, pdf_path])

        csv_path = temp_path / "metrics_all_runs.csv"
        csv_path.write_text(csv_content)

        # Create a ZIP archive with SVGs, PDFs, and the CSV.
        zip_path = temp_path / "metric.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:

            for plot_path in plot_paths:
                archive.write(plot_path, arcname=plot_path.name)

            archive.write(csv_path, arcname=csv_path.name)

        return zip_path.read_bytes()


def _load_experiment_data(
    db: Session,
    experiment_context: ExperimentContext,
) -> list[dict]:

    # The caller already verifies auth before building ExperimentContext
    runs = get_runs_for_experiment_and_dataset(
        db,
        experiment_context.experiment_id,
        experiment_context.dataset_id,
        include_experiment=True,
    )

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


def _save_experiment_consensus_json(
    experiment_id: str,
    dataset_id: str,
    reference_run_id: str,
    consensus_df: pd.DataFrame
) -> None:

    workspace = ExperimentWorkspace(experiment_id)
    consensus_file = workspace.consensus_file(dataset_id)
    consensus_file.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "metadata": {
            "experiment_id": experiment_id,
            "dataset_id": dataset_id,
            "reference_run": reference_run_id,
            "num_spots": len(consensus_df)
        },
        "spots": consensus_df[["barcode", "x", "y", "domain"]].to_dict(orient="records")
    }

    consensus_file.write_text(json.dumps(payload, indent=2))



def build_domain_comparison(
    db: Session,
    request: ComparisonRequest
) -> dict:

    item_a, item_b = request.experiments

    experiment_a = require_experiment_with_access(db, item_a.experiment_id, item_a.token)
    experiment_b = require_experiment_with_access(db, item_b.experiment_id, item_b.token)

    experiment_a_context = ExperimentContext(
        experiment_id=item_a.experiment_id, dataset_id=request.dataset_id, token=item_a.token
    )
    experiment_b_context = ExperimentContext(
        experiment_id=item_b.experiment_id, dataset_id=request.dataset_id, token=item_b.token
    )

    runs_results_a = _load_experiment_data(db, experiment_a_context)
    runs_results_b = _load_experiment_data(db, experiment_b_context)

    consensus_df_a = _load_experiment_consensus(experiment_a_context, runs_results_a)
    consensus_df_b = _load_experiment_consensus(experiment_b_context, runs_results_b)

    score_a = _compute_mean_metric_score(runs_results_a)
    score_b = _compute_mean_metric_score(runs_results_b)

    merged_aligned_df = align_domains(consensus_df_a, consensus_df_b, score_a, score_b)

    spots = merged_aligned_df[["barcode", "x", "y", "A", "B"]].to_dict(orient="records")
    domain_metrics = _compute_domain_metrics(merged_aligned_df)

    return {
        "experiments": {
            "A": {"experiment_id": item_a.experiment_id, "tool_name": experiment_a.tool_name},
            "B": {"experiment_id": item_b.experiment_id, "tool_name": experiment_b.tool_name}
        },
        "spots": spots,
        "domain_metrics": domain_metrics
    }


def align_domains(
    df_a: pd.DataFrame,
    df_b: pd.DataFrame,
    score_a: float,
    score_b: float
) -> pd.DataFrame:

    if score_a >= score_b:
        ref_df, other_df, ref_key, other_key = df_a, df_b, "A", "B"
    else:
        ref_df, other_df, ref_key, other_key = df_b, df_a, "B", "A"

    # Merge and Align
    merged = ref_df.set_index("barcode")[["x", "y", "domain"]].rename(
        columns={"domain": ref_key}
    ).join(
        other_df.set_index("barcode")[["domain"]].rename(columns={"domain": other_key}),
        how="inner"
    ).reset_index()

    merged[other_key] = align_tool_labels(
        merged[ref_key].to_numpy(),
        merged[other_key].to_numpy()
    )

    return merged


def _compute_domain_metrics(
        df: pd.DataFrame
) -> list[dict]:

    domains = sorted(df["A"].unique().tolist())

    records = []
    for k in domains:
        a_k = df["A"] == k
        b_k = df["B"] == k

        intersection = int((a_k & b_k).sum())
        a_only = int((a_k & ~b_k).sum())
        b_only = int((~a_k & b_k).sum())

        union = intersection + a_only + b_only

        jaccard = round(intersection / union, 4) if union > 0 else 0.0
        records.append({
            "domain": k,
            "intersection": intersection,
            "expA_only": a_only,
            "expB_only": b_only,
            "jaccard": jaccard
        })
    return records


def build_consensus_predictions(
    db: Session,
    request: ComparisonRequest
) -> dict:

    experiment_consensuses = _load_experiment_consensus_data(db, request)

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


def build_overlay_domain_map(
    db: Session,
    request: ComparisonRequest
) -> dict:

    experiment_data = _load_experiment_consensus_data(db, request)

    common_barcodes = _find_common_barcodes(experiment_data)

    aligned_domains = _align_experiments_to_reference(
        experiment_data,
        common_barcodes
    )

    reference_exp = experiment_data[0]
    reference_df = (
        reference_exp["consensus_df"]
        .set_index("barcode")
        .loc[common_barcodes]
    )

    x_values = reference_df["x"].to_numpy()
    y_values = reference_df["y"].to_numpy()

    spots = []

    for row_idx, barcode in enumerate(common_barcodes):
        spots.append({
            "spot_id": barcode,
            "x": float(x_values[row_idx]),
            "y": float(y_values[row_idx]),
            "domains": {
                exp_id: int(domain_values[row_idx])
                for exp_id, domain_values in aligned_domains.items()
            }
        })

    return {
        "tools": [exp["tool_name"] for exp in experiment_data],
        "spots": spots
    }



def _load_experiment_consensus_data(
    db: Session,
    request: ComparisonRequest
) -> list[dict]:

    experiment_data = []

    for exp_item in request.experiments:
        experiment = require_experiment_with_access(db, exp_item.experiment_id, exp_item.token)

        experiment_context = ExperimentContext(
            experiment_id=exp_item.experiment_id,
            dataset_id=request.dataset_id,
            token=exp_item.token,
        )

        runs_data = _load_experiment_data(db, experiment_context)

        consensus_df = _load_experiment_consensus(experiment_context, runs_data)

        mean_metric_score = _compute_mean_metric_score(runs_data)

        experiment_data.append({
            "experiment_id": exp_item.experiment_id,
            "tool_name": experiment.tool_name,
            "consensus_df": consensus_df,
            "mean_metric_score": mean_metric_score
        })

    return experiment_data


def _find_common_barcodes(
    experiment_data: list[dict]
) -> list[str]:

    barcode_sets = [
        set(exp["consensus_df"]["barcode"])
        for exp in experiment_data
    ]

    return sorted(list(set.intersection(*barcode_sets)))


def _align_experiments_to_reference(
    experiment_data: list[dict],
    common_barcodes: list[str]
) -> dict[str, np.ndarray]:

    mean_scores = np.asarray(
        [exp["mean_metric_score"] for exp in experiment_data],
        dtype=float
    )

    reference_idx = int(np.argmax(mean_scores))

    reference_df = (
        experiment_data[reference_idx]["consensus_df"]
        .set_index("barcode")
        .loc[common_barcodes]
    )

    reference_labels = reference_df["domain"].to_numpy().astype(int)

    aligned_domains = {}

    for idx, exp in enumerate(experiment_data):

        labels = (
            exp["consensus_df"]
            .set_index("barcode")
            .loc[common_barcodes, "domain"]
            .to_numpy()
            .astype(int)
        )

        if idx != reference_idx:
            labels = align_tool_labels(reference_labels, labels)

        aligned_domains[exp["experiment_id"]] = labels

    return aligned_domains




def _load_experiment_consensus(
    experiment_context: ExperimentContext,
    runs_data: list[dict],
) -> pd.DataFrame:

    workspace = ExperimentWorkspace(experiment_context.experiment_id)
    consensus_file_path = workspace.consensus_file(experiment_context.dataset_id)

    if not consensus_file_path.exists():
        consensus_df = compute_experiment_consensus(experiment_context, runs_data)
    else:
        payload = json.loads(consensus_file_path.read_text())

        consensus_df = pd.DataFrame(payload["spots"])[["barcode", "x", "y", "domain"]]

    return consensus_df


def compute_experiment_consensus(
    experiment_context: ExperimentContext,
    runs_data: list[dict],
) -> pd.DataFrame:

    run_dfs = [run["spots_df"] for run in runs_data]

    labels_matrix, common_barcodes = build_label_matrix(run_dfs)

    reference_idx = _select_reference_run(runs_data)

    consensus_labels, _ = _compute_consensus(
        labels_matrix=labels_matrix,
        reference_idx=reference_idx
    )

    # Carry x, y from the reference run
    reference_spots_df = runs_data[reference_idx]["spots_df"].set_index("barcode")
    xy = reference_spots_df.loc[common_barcodes, ["x", "y"]]

    experiment_consensus_df = pd.DataFrame({
        "barcode": common_barcodes,
        "x": xy["x"].values,
        "y": xy["y"].values,
        "domain": consensus_labels
    })

    _save_experiment_consensus_json(
        experiment_id=experiment_context.experiment_id,
        dataset_id=experiment_context.dataset_id,
        reference_run_id=runs_data[reference_idx]["run_id"],
        consensus_df=experiment_consensus_df
    )

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
    experiment_consensuses: list[dict]
) -> dict:

    common_barcodes = _find_common_barcodes(experiment_consensuses)

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