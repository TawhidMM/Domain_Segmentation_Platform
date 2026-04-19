from collections import defaultdict

from sqlalchemy.orm import Session

from app.schemas.comparison import (
    ComparisonDatasetsResponseItem,
    ComparisonDatasetToolItem,
    ComparisonDatasetsRequest,
    ComparisonDatasetsResponse,
)
from app.services.experiment_service import require_experiment_with_access
from app.services.run_service import get_datasets_for_experiment


def discover_datasets_for_comparison(
    db: Session,
    request: ComparisonDatasetsRequest,
) -> ComparisonDatasetsResponse:

    dataset_tools: dict[str, dict[str, str]] = defaultdict(dict)

    for experiment_request in request.experiments:
        experiment = require_experiment_with_access(
            db,
            experiment_request.experiment_id,
            experiment_request.token,
        )

        dataset_ids = get_datasets_for_experiment(db, experiment_request.experiment_id)

        for dataset_id in dataset_ids:
            dataset_tools[dataset_id][experiment.id] = experiment.tool_name

    datasets = [
        ComparisonDatasetsResponseItem(
            dataset_id=dataset_id,
            tools=[
                ComparisonDatasetToolItem(
                    experiment_id=experiment_id,
                    tool_name=tool_name,
                )
                for experiment_id, tool_name in sorted(tools.items())
            ],
        )
        for dataset_id, tools in sorted(dataset_tools.items())
    ]

    return ComparisonDatasetsResponse(datasets=datasets)
