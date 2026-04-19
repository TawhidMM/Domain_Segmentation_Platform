from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.core.metrics_schema import METRICS
from app.models.run import Run
from app.schemas.comparison import ComparisonMetricsRequest, ExperimentMetricsRequest
from app.schemas.experiment import DomainComparisonItem
from app.services.experiment_service import require_experiment_with_access
from app.services.run_service import (
    build_run_context,
    get_runs_for_experiment_and_dataset,
    load_metrics_file, get_runs_for_experiment,
)

METRIC_KEYS = list(METRICS.keys())


def _apply_metric_direction(
    metrics: dict
) -> dict[str, float]:

    for metric_key in METRIC_KEYS:
        direction = METRICS[metric_key].get("direction")

        if direction == "lower":
            metrics[metric_key] = -metrics[metric_key]

    return metrics


def calculate_composite_score(
    metrics: Dict[str, float]
) -> Dict[str, float]:

    scored_metrics = metrics.copy()

    scored_metrics = _apply_metric_direction(scored_metrics)

    scored_metrics["composite_score"] = sum(scored_metrics[key] for key in METRIC_KEYS)

    return scored_metrics


def _collect_metrics_from_runs(
    db: Session,
    runs: List[Run]
) -> List[Dict[str, Any]]:

    run_data = []
    for run in runs:
        run_context = build_run_context(db, run)
        metrics = load_metrics_file(run_context)
        run_data.append({
            "run_id": run.id,
            "dataset_id": run_context.dataset_id,
            "run_context": run_context,
            "metrics": metrics
        })

    return run_data


def collect_experiment_metrics(
    db: Session,
    request: ComparisonMetricsRequest
) -> Dict[str, Dict[str, Any]]:

    result = {}
    for experiment in request.experiments:

        result[experiment.experiment_id] = get_experiment_run_metrics(
            db,
            ExperimentMetricsRequest(
                experiment_id=experiment.experiment_id,
                token=experiment.token
            )
        )

    return result


def select_best_run_for_experiment(
    db: Session,
    request: DomainComparisonItem,
):
    require_experiment_with_access(db, request.experiment_id, request.token)

    runs = get_runs_for_experiment_and_dataset(
        db,
        request.experiment_id,
        request.dataset_id,
        include_experiment=True,
    )
    candidate_runs_metrics = _collect_metrics_from_runs(db, runs)

    for run in candidate_runs_metrics:
        run["metrics"] = calculate_composite_score(run["metrics"])

    best = max(candidate_runs_metrics, key=_get_composite_score)

    return best["run_context"]


def _get_composite_score(
    run: dict[str, Any]
) -> float:

    return run["metrics"]["composite_score"]


def get_experiment_run_metrics(
    db: Session,
    request: ExperimentMetricsRequest
) -> dict:

    experiment = require_experiment_with_access(db, request.experiment_id, request.token)

    runs = get_runs_for_experiment(
        db,
        request.experiment_id,
        include_experiment=True,
    )
    run_metrics = _collect_metrics_from_runs(db, runs)


    for run in run_metrics:
        run.pop("run_context")

    return {
        "experiment_id": request.experiment_id,
        "tool_name": experiment.tool_name,
        "runs": run_metrics
    }