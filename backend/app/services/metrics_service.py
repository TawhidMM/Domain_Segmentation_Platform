from typing import Any, Dict, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.metrics_schema import METRICS
from app.repositories.experiment_repository import get_experiment_by_id
from app.schemas.comparison import ComparisonRequest
from app.schemas.experiment import DomainComparisonItem
from app.services.experiment_service import require_experiment_with_access
from app.services.run_service import build_run_context, load_metrics_file, get_datasets_for_experiment, \
    get_runs_for_experiment_and_dataset

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


def _all_runs_metrics_for_experiment(
    db: Session,
    request: DomainComparisonItem
) -> List[Dict[str, Any]]:

    runs = get_runs_for_experiment_and_dataset(db, request.experiment_id, request.dataset_id)

    run_data = []
    for run in runs:
        run_context = build_run_context(db, run)
        metrics = load_metrics_file(run_context)
        run_data.append({
            "run_context": run_context,
            "metrics": metrics
        })

    return run_data


def collect_experiment_metrics(
    db: Session,
    comparison_request: ComparisonRequest
) -> Dict[str, Dict[str, Any]]:

    result = {}
    for experiment in comparison_request.experiments:

        result[experiment] = get_experiment_run_metrics(
            db,
            DomainComparisonItem(
                experiment_id=experiment.experiment_id,
                token=experiment.token,
                dataset_id=comparison_request.dataset_id
            )
        )

    return result


def select_best_run_for_experiment(
    db: Session,
    request: DomainComparisonItem,
):
    require_experiment_with_access(db, request.experiment_id, request.token)

    candidate_runs_metrics = _all_runs_metrics_for_experiment(db, request)

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
    request: DomainComparisonItem
) -> dict:

    experiment = require_experiment_with_access(db, request.experiment_id, request.token)

    run_metrics = _all_runs_metrics_for_experiment(db, request)

    for run in run_metrics:
        run["run_id"] = run["run_context"].run_id
        run.pop("run_context")

    return {
        "experiment_id": request.experiment_id,
        "tool_name": experiment.tool_name,
        "runs": run_metrics
    }