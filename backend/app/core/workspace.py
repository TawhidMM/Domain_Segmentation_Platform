from app.core.config import settings

class Workspace:
    _INPUT_DIR = "input"
    _OUTPUT_DIR = "outputs"
    _LOGS_DIR = "logs"
    _CONFIG_DIR = "config"

    _FRONTEND_RESULT_FILENAME = "frontend_result.json"
    _RESULT_METRIC_FILENAME = "metrics.json"
    _EMBEDDINGS_FILENAME = "embeddings.csv"


    def __init__(self, job_id: str):
        self._job_id = job_id
        self._root = settings.EXPERIMENTS_ROOT / job_id

    @property
    def root_dir(self):
        return self._root

    @property
    def input_dir(self):
        return self._root / self._INPUT_DIR

    @property
    def output_dir(self):
        return self._root / self._OUTPUT_DIR

    @property
    def config_dir(self):
        return self._root / self._CONFIG_DIR

    @property
    def logs_dir(self):
        return self._root / self._LOGS_DIR

    @property
    def result_file(self):
        return self.output_dir / self._FRONTEND_RESULT_FILENAME

    @property
    def metrics_file(self):
        return self.output_dir / self._RESULT_METRIC_FILENAME

    @property
    def embeddings_file(self):
        return self.output_dir / self._EMBEDDINGS_FILENAME
