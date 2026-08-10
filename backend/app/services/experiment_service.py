import shutil
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.workspace import ExperimentWorkspace
from app.models.experiment import Experiment, ExperimentStatus
from app.models.run import Run
from app.models.run_config import RunConfig
from app.repositories import dataset_repository, experiment_repository, run_config_repository, run_repository
from app.schemas.experiment import DatasetConfigRequest, DatasetRunMapping, ImportResultsDatasetRequest
from app.services.dataset_service import require_dataset
from app.services.annotation_service import get_annotation_json
from app.utils.security import generate_token_pair, verify_token


def _create_run_config_entity(
    run_config_id: str,
    experiment_id: str,
    dataset_id: str,
    params_dict: dict,
    annotation_id: Optional[str] = None,
) -> RunConfig:

    """Create a RunConfig that stores dataset-specific params."""
    run_config_kwargs = {
        "id": run_config_id,
        "experiment_id": experiment_id,
        "dataset_id": dataset_id,
        "params_json": params_dict,
    }
    if annotation_id is not None:
        run_config_kwargs["annotation_id"] = annotation_id

    return RunConfig(
        **run_config_kwargs
    )


def _create_experiment_entity(
    experiment_id: str,
    tool_name: str,
    workspace_path: str,
    total_runs: int,
    token_hash: str
) -> Experiment:

    return Experiment(
        id=experiment_id,
        tool_name=tool_name,
        workspace_path=workspace_path,
        total_runs=total_runs,
        completed_runs=0,
        status=ExperimentStatus.QUEUED,
        access_token_hash=token_hash,
    )


def _create_run_entity(
    run_id: str,
    run_config_id: str,
    seed: int,
    output_path: str
) -> Run:
    """Create a Run that points to a RunConfig for dataset and params."""
    return Run(
        id=run_id,
        run_config_id=run_config_id,
        seed=seed,
        status=ExperimentStatus.QUEUED,
        output_path=output_path,
        metrics_json=None,
    )


def _create_run_folders(
    exp_workspace: ExperimentWorkspace,
    run_ids: List[str]
) -> None:

    for run_id in run_ids:
        run_root = exp_workspace.run_root(run_id)
        run_root.mkdir(parents=True, exist_ok=True)


def _prepare_run_configs(
    experiment_id: str,
    dataset_configs: List[DatasetConfigRequest],
) -> List[RunConfig]:
    """Create one RunConfig entity per dataset config item."""
    run_configs = []

    for config in dataset_configs:
        run_config_id = str(uuid.uuid4())
        run_config = _create_run_config_entity(
            run_config_id=run_config_id,
            experiment_id=experiment_id,
            dataset_id=config.dataset_id,
            params_dict=config.params,
            annotation_id=config.annotation_id,
        )
        run_configs.append(run_config)

    return run_configs


def _prepare_runs_for_configs(
    run_configs: List[RunConfig],
    exp_workspace: ExperimentWorkspace,
    seed_list: List[int],
) -> Tuple[List[Run], List[Tuple[str, str]]]:
    """Create Run entities for the provided RunConfig entities.
    
    Returns a tuple of (runs, run_dataset_pairs) where run_dataset_pairs is a list
    of (run_id, dataset_id) tuples for mapping runs to their datasets.
    """
    runs = []
    run_ids = []
    run_dataset_pairs = []

    for run_config in run_configs:
        for seed in seed_list:
            run_id = str(uuid.uuid4())
            run_ids.append(run_id)

            run_path = str(exp_workspace.run_root(run_id))

            run = _create_run_entity(
                run_id=run_id,
                run_config_id=run_config.id,
                seed=seed,
                output_path=run_path
            )
            runs.append(run)
            run_dataset_pairs.append((run_id, run_config.dataset_id))

    _create_run_folders(exp_workspace, run_ids)

    return runs, run_dataset_pairs


def create_experiment_record(
    db: Session,
    dataset_param_configs: List[DatasetConfigRequest],
    tool_name: str,
    seed_list: List[int]
) -> Tuple[str, str, List[DatasetRunMapping]]:

    if not dataset_param_configs:
        raise HTTPException(status_code=400, detail="At least one dataset config is required")

    for dataset_config in dataset_param_configs:
        require_dataset(db, dataset_config.dataset_id)

        if dataset_config.annotation_id:
            get_annotation_json(
                db,
                dataset_id=dataset_config.dataset_id,
                annotation_id=dataset_config.annotation_id,
            )

    experiment_id = str(uuid.uuid4())
    access_token, token_hash = generate_token_pair()

    exp_workspace = ExperimentWorkspace(experiment_id)

    # Create Experiment: high-level metadata only
    experiment = _create_experiment_entity(
        experiment_id=experiment_id,
        tool_name=tool_name,
        workspace_path=str(exp_workspace.workspace_root),
        total_runs=len(seed_list) * len(dataset_param_configs),
        token_hash=token_hash
    )

    experiment_repository.create_experiment(db, experiment)

    # Prepare entries in separate steps.
    run_configs = _prepare_run_configs(
        experiment_id=experiment_id,
        dataset_configs=dataset_param_configs,
    )

    run_config_repository.create_run_configs_batch(db, run_configs)

    runs, run_dataset_pairs = _prepare_runs_for_configs(
        run_configs=run_configs,
        exp_workspace=exp_workspace,
        seed_list=seed_list,
    )

    run_repository.create_runs_batch(db, runs)

    # Group run_ids by dataset_id
    runs_by_dataset = defaultdict(list)
    for run_id, dataset_id in run_dataset_pairs:
        runs_by_dataset[dataset_id].append(run_id)

    runs_by_dataset_list = [
        DatasetRunMapping(dataset_id=ds_id, run_ids=rids)
        for ds_id, rids in runs_by_dataset.items()
    ]

    return experiment_id, access_token, runs_by_dataset_list


def require_experiment_with_access(
    db: Session,
    experiment_id: str,
    token: str
) -> Experiment:

    experiment = experiment_repository.get_experiment_by_id(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if not verify_token(token, experiment.access_token_hash):
        raise HTTPException(status_code=403, detail="Invalid access token")

    return experiment


def build_experiment_details(
    db: Session,
    experiment_id: str,
    token: str
) -> dict:

    # Validate access first
    experiment = require_experiment_with_access(db, experiment_id, token)

    # Group runs by dataset through run_configs
    runs_by_dataset = defaultdict(list)
    
    for run_config in experiment.run_configs:
        for run in run_config.runs:
            runs_by_dataset[run_config.dataset_id].append({
                "run_id": run.id,
                "seed": run.seed,
                "status": run.status.value,
                "started_at": run.started_at,
                "finished_at": run.finished_at
            })

    dataset_ids = list(runs_by_dataset.keys())
    dataset_entities = dataset_repository.get_datasets_by_ids(db, dataset_ids)
    dataset_name_map = {
        dataset.dataset_id: dataset.dataset_name
        for dataset in dataset_entities
    }
    
    # Build dataset list
    datasets = [
        {
            "dataset_id": dataset_id,
            "dataset_name": dataset_name_map.get(dataset_id, f"dataset-{index + 1}"),
            "runs": runs
        }
        for index, (dataset_id, runs) in enumerate(runs_by_dataset.items())
    ]
    
    return {
        "experiment_id": experiment.id,
        "tool_name": experiment.tool_name,
        "experiment_status": experiment.status.value,
        "started_at": experiment.started_at,
        "finished_at": experiment.finished_at,
        "datasets": datasets
    }


def create_imported_experiment_record(
    db: Session,
    results: list[ImportResultsDatasetRequest],
    tool_name: str,
) -> Tuple[ str, str, List[Dict[str, str]] ]:

    for result in results:
        require_dataset(db, result.dataset_id)

    experiment_id = str(uuid.uuid4())
    access_token, token_hash = generate_token_pair()
    
    exp_workspace = ExperimentWorkspace(experiment_id)
    
    experiment = _create_experiment_entity(
        experiment_id=experiment_id,
        tool_name=tool_name,
        workspace_path=str(exp_workspace.workspace_root),
        total_runs=1,
        token_hash=token_hash
    )
    
    experiment_repository.create_experiment(db, experiment)
    
    run_configs, runs, staging_data = _prepare_imported_run_components(results, experiment_id, exp_workspace)

    run_config_repository.create_run_configs_batch(db, run_configs)
    run_repository.create_runs_batch(db, runs)
    db.commit()

    experiment_db = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    experiment_db.status = ExperimentStatus.RUNNING
    experiment_db.started_at = datetime.now(timezone.utc)
    db.commit()
    
    return experiment_id, access_token, staging_data



def _prepare_imported_run_components(
    results: List[ImportResultsDatasetRequest],
    experiment_id: str,
    exp_workspace: ExperimentWorkspace,
) -> Tuple[ List[RunConfig], List[Run], List[Dict[str, str]] ]:

    run_configs = []
    runs = []
    staging_data = []

    for item in results:
        # Generate cohesive relational keys
        run_config_id = str(uuid.uuid4())
        run_id = str(uuid.uuid4())

        run_path = exp_workspace.run_root(run_id)
        run_path.mkdir(parents=True, exist_ok=True)

        # Build RunConfig
        run_config = _create_run_config_entity(
            run_config_id=run_config_id,
            experiment_id=experiment_id,
            dataset_id=item.dataset_id,
            params_dict={},
            annotation_id=None,
        )
        run_configs.append(run_config)

        # Build Run
        run = _create_run_entity(
            run_id=run_id,
            run_config_id=run_config_id,
            seed=0,
            output_path=str(run_path)
        )
        runs.append(run)

        staging_data.append(
            {
                "run_id": run_id,
                "dataset_id": item.dataset_id,
                "stage_id": item.stage_id
            }
        )

    return run_configs, runs, staging_data


def delete_experiment(
    db: Session,
    experiment_id: str,
    token: str
):
    experiment = require_experiment_with_access(db, experiment_id, token)
    workspace = ExperimentWorkspace(experiment_id)

    db.delete(experiment)

    if workspace.workspace_root.exists():
        try:
            shutil.rmtree(workspace.workspace_root)
        except Exception:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clean up experiment assets. Action aborted."
            )

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred."
        )