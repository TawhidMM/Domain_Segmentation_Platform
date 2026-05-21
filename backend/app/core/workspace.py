from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.storage_space import DatasetSpace


class ExperimentWorkspace:

    _DATASETS_DIR: str = "datasets"
    _RUNS_DIR: str = "runs"
    _ARTIFACTS_DIR: str = "artifacts"
    _CONSENSUS_FILE: str = "experiment_consensus.json"

    @classmethod
    def base_directory(cls) -> Path:
        return settings.INTERNAL_EXPERIMENTS_ROOT

    def __init__(self, experiment_id: str):
        self._experiment_id = experiment_id
        self._root: Path = settings.INTERNAL_EXPERIMENTS_ROOT / experiment_id

    @property
    def workspace_root(self) -> Path:
        return self._root

    def run_root(self, run_id: str) -> Path:
        return self._root / self._RUNS_DIR / run_id

    def consensus_file(self, dataset_id: str) -> Path:
        return self._root / self._ARTIFACTS_DIR / dataset_id / "consensus" / self._CONSENSUS_FILE


class RunWorkspace:

    _OUTPUT_DIR: str = "outputs"
    _LOGS_DIR: str = "logs"
    _CONFIG_DIR: str = "config"
    _FRONTEND_RESULT_FILE: str = "frontend_result.json"
    _METRICS_FILE: str = "metrics.json"
    _EMBEDDINGS_FILE: str = "embeddings.csv"

    def __init__(self, run_root: Path):
        self.root = run_root

    @property
    def output_dir(self) -> Path:
        return self.root / self._OUTPUT_DIR

    @property
    def logs_dir(self) -> Path:
        return self.root / self._LOGS_DIR

    @property
    def config_dir(self) -> Path:
        return self.root / self._CONFIG_DIR

    @property
    def result_file(self) -> Path:
        return self.output_dir / self._FRONTEND_RESULT_FILE

    @property
    def metrics_file(self) -> Path:
        return self.output_dir / self._METRICS_FILE

    @property
    def embeddings_file(self) -> Path:
        return self.output_dir / self._EMBEDDINGS_FILE


@dataclass(frozen=True)
class RunContext:

    experiment_id: str
    run_id: str
    dataset_id: str
    annotation_id: Optional[str]

    experiment_workspace: ExperimentWorkspace
    run_workspace: RunWorkspace
    dataset_space: DatasetSpace


    tool_name: str
    params: Dict[str, Any] = field(default_factory=dict)
    seed: Optional[int] = None


    @property
    def dataset_path(self) -> Path:
        return self.dataset_space.dataset_path

    @property
    def output_dir(self) -> Path:
        return self.run_workspace.output_dir

    @property
    def logs_dir(self) -> Path:
        return self.run_workspace.logs_dir

    @property
    def config_dir(self) -> Path:
        return self.run_workspace.config_dir

    @property
    def result_file(self) -> Path:
        return self.run_workspace.result_file

    @property
    def metrics_file(self) -> Path:
        return self.run_workspace.metrics_file

    @property
    def embeddings_file(self) -> Path:
        return self.run_workspace.embeddings_file

    @property
    def annotations_file_path(self) -> Optional[Path]:
        if self.annotation_id:
            return self.dataset_space.annotation_file_path(self.annotation_id)
        return None

    @property
    def absolute_workspace_path(self) -> Path:
        relative_workspace_path = self.experiment_workspace.run_root(self.run_id).relative_to(settings.INTERNAL_EXPERIMENTS_ROOT)
        return settings.HOST_EXPERIMENTS_ROOT / relative_workspace_path

    @property
    def absolute_dataset_path(self) -> Path:
        return self.dataset_space.host_dataset_path

    @property
    def absolute_annotation_file_path(self) -> Optional[Path]:
        if self.annotation_id is None:
            return None

        return self.dataset_space.host_annotation_file_path(self.annotation_id)


    @classmethod
    def create(
        cls,
        experiment_id: str,
        run_id: str,
        dataset_id: str,
        tool_name: str,
        params: Dict[str, Any],
        annotation_id: Optional[str] = None,
        seed: Optional[int] = None
    ) -> "RunContext":

        experiment_workspace = ExperimentWorkspace(experiment_id)
        run_workspace = RunWorkspace(experiment_workspace.run_root(run_id))
        dataset_space = DatasetSpace(dataset_id)

        return cls(
            experiment_id=experiment_id,
            run_id=run_id,
            dataset_id=dataset_id,
            annotation_id=annotation_id,
            experiment_workspace=experiment_workspace,
            run_workspace=run_workspace,
            dataset_space=dataset_space,
            tool_name=tool_name,
            params=params,
            seed=seed
        )
