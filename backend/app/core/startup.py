from app.core.config import settings
from app.core.storage_space import DatasetSpace, StagingSpace
from app.core.workspace import ExperimentWorkspace


def create_directories():
    ExperimentWorkspace.base_directory().mkdir(parents=True, exist_ok=True)
    DatasetSpace.base_directory().mkdir(parents=True, exist_ok=True)
    StagingSpace.base_directory().mkdir(parents=True, exist_ok=True)
