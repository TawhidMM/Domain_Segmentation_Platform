from abc import ABC, abstractmethod

from app.core.workspace import Workspace


class ToolAdapter(ABC):

    def __init__(self, workspace: Workspace):
        self.workspace = workspace

    @abstractmethod
    def prepare_inputs(self, dataset_id: str):
        pass

    @abstractmethod
    def build_config(self, user_params: dict) -> dict:
        pass

    @abstractmethod
    def build_frontend_output(self, job_id: str) -> dict:
        pass
