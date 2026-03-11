import uuid
from typing import List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict
import random

from app.core.workspace import ExperimentWorkspace
from app.models import Dataset
from app.models.experiment import Experiment, ExperimentStatus
from app.models.run import Run
from app.repositories import dataset_repository, experiment_repository, run_repository
from app.utils.security import generate_token_pair, verify_token


def require_dataset(
    db: Session,
    dataset_id: str
) -> Dataset:

    dataset = dataset_repository.get_dataset_by_id(db, dataset_id)
    if not dataset:
        raise HTTPException(400, "Dataset not found or not finalized")
    return dataset



# def get_experiment(
#     db,
#     experiment_id: str
# ) -> Experiment:




def _validate_and_prepare_seeds(
    number_of_runs: int,
    seed_list: Optional[List[int]] = None
) -> List[int]:

    if seed_list is not None:
        if len(seed_list) != number_of_runs:
            raise HTTPException(
                status_code=400,
                detail=f"seed_list length ({len(seed_list)}) must match number_of_runs ({number_of_runs})"
            )
        return seed_list


    return [random.randint(0, 2**31 - 1) for _ in range(number_of_runs)]


def _create_experiment_entity(
    experiment_id: str,
    tool_name: str,
    params_dict: dict,
    workspace_path: str,
    total_runs: int,
    token_hash: str
) -> Experiment:

    return Experiment(
        id=experiment_id,
        tool_name=tool_name,
        params_json=params_dict,
        workspace_path=workspace_path,
        total_runs=total_runs,
        completed_runs=0,
        status=ExperimentStatus.QUEUED,
        access_token_hash=token_hash,
        started_at=None,
        finished_at=None
    )


def _create_run_entity(
    run_id: str,
    experiment_id: str,
    dataset_id: str,
    seed: int,
    output_path: str
) -> Run:

    return Run(
        id=run_id,
        experiment_id=experiment_id,
        dataset_id=dataset_id,
        seed=seed,
        status=ExperimentStatus.QUEUED,
        output_path=output_path,
        metrics_json=None,
        started_at=None,
        finished_at=None
    )


def _create_run_folders(
    exp_workspace: ExperimentWorkspace,
    run_ids: List[str]
) -> None:

    for run_id in run_ids:
        run_root = exp_workspace.run_root(run_id)
        run_root.mkdir(parents=True, exist_ok=True)


def _prepare_runs(
    experiment_id: str,
    dataset_id: str,
    exp_workspace: ExperimentWorkspace,
    number_of_runs: int,
    seed_list: List[int]
) -> List[Run]:

    runs = []
    run_ids = []
    
    for i in range(number_of_runs):
        run_id = str(uuid.uuid4())
        run_ids.append(run_id)
        
        run_path = str(exp_workspace.run_root(run_id))
        
        run = _create_run_entity(
            run_id=run_id,
            experiment_id=experiment_id,
            dataset_id=dataset_id,
            seed=seed_list[i],
            output_path=run_path
        )
        runs.append(run)

    _create_run_folders(exp_workspace, run_ids)
    
    return runs


def create_experiment_record(
    db: Session,
    dataset_id: str,
    tool_name: str,
    params_dict: dict,
    number_of_runs: int = 1,
    seed_list: Optional[List[int]] = None
) -> Tuple[str, str]:

    require_dataset(db, dataset_id)

    validated_seeds = _validate_and_prepare_seeds(number_of_runs, seed_list)

    experiment_id = str(uuid.uuid4())
    access_token, token_hash = generate_token_pair()

    exp_workspace = ExperimentWorkspace(experiment_id)

    experiment = _create_experiment_entity(
        experiment_id=experiment_id,
        tool_name=tool_name,
        params_dict=params_dict,
        workspace_path=str(exp_workspace.workspace_root),
        total_runs=number_of_runs,
        token_hash=token_hash
    )

    experiment_repository.create_experiment(db, experiment)

    runs = _prepare_runs(
        experiment_id=experiment_id,
        dataset_id=dataset_id,
        exp_workspace=exp_workspace,
        number_of_runs=number_of_runs,
        seed_list=validated_seeds
    )

    run_repository.create_runs_batch(db, runs)
    
    return experiment_id, access_token


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


def build_nested_experiment_response(
    db: Session,
    experiment_id: str,
    token: str
) -> dict:



    # Validate access first
    require_experiment_with_access(db, experiment_id, token)

    # Fetch experiment with runs eagerly loaded (optimized)
    experiment = experiment_repository.get_experiment_with_runs(db, experiment_id)

    # Group runs by dataset_id
    runs_by_dataset = defaultdict(list)
    
    for run in experiment.runs:
        runs_by_dataset[run.dataset_id].append({
            "run_id": run.id,
            "status": run.status.value,
            "started_at": run.started_at,
            "finished_at": run.finished_at
        })
    
    # Build datasets list
    datasets = [
        {
            "dataset_id": dataset_id,
            "runs": runs
        }
        for dataset_id, runs in runs_by_dataset.items()
    ]
    
    return {
        "experiment_id": experiment.id,
        "tool_name": experiment.tool_name,
        "started_at": experiment.started_at,
        "finished_at": experiment.finished_at,
        "datasets": datasets
    }
