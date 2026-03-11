from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, Any

from app.core.config import settings


class ExperimentWorkspace:

    _DATASETS_DIR: str = "datasets"
    _RUNS_DIR: str = "runs"
    _ARTIFACTS_DIR: str = "artifacts"
    _CONSENSUS_FILE: str = "experiment_consensus.json"

    def __init__(self, experiment_id: str):
        self._experiment_id = experiment_id
        self._root: Path = settings.EXPERIMENTS_ROOT / experiment_id

    @property
    def workspace_root(self) -> Path:
        return self._root

    @property
    def datasets_root(self) -> Path:
        return self._root / self._DATASETS_DIR

    @property
    def runs_root(self) -> Path:
        return self._root / self._RUNS_DIR

    @property
    def artifacts_root(self) -> Path:
        return self._root / self._ARTIFACTS_DIR

    def dataset_dir(self, dataset_id: str) -> Path:
        return self.datasets_root / dataset_id

    def run_root(self, run_id: str) -> Path:
        return self.runs_root / run_id

    def consensus_file(self, dataset_id: str) -> Path:
        return self.artifacts_root / dataset_id / "consensus" / self._CONSENSUS_FILE


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

    experiment_workspace: ExperimentWorkspace
    run_workspace: RunWorkspace


    tool_name: Optional[str] = None
    params: Dict[str, Any] = field(default_factory=dict)
    seed: Optional[int] = None

    @property
    def experiment_root(self) -> Path:
        return self.experiment_workspace.workspace_root

    @property
    def dataset_root(self) -> Path:
        return self.experiment_workspace.datasets_root

    @property
    def dataset_path(self) -> Path:
        return self.experiment_workspace.dataset_dir(self.dataset_id)

    @property
    def run_root(self) -> Path:
        return self.run_workspace.root

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

    @classmethod
    def create(
        cls,
        experiment_id: str,
        run_id: str,
        dataset_id: str,
        tool_name: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        seed: Optional[int] = None
    ) -> "RunContext":

        exp_ws = ExperimentWorkspace(experiment_id)
        run_ws = RunWorkspace(exp_ws.run_root(run_id))

        return cls(
            experiment_id=experiment_id,
            run_id=run_id,
            dataset_id=dataset_id,
            experiment_workspace=exp_ws,
            run_workspace=run_ws,
            tool_name=tool_name,
            params=params,
            seed=seed
        )
