from abc import ABC, abstractmethod

from app.core.workspace import RunContext


class ToolAdapter(ABC):

    def __init__(self, run_context: RunContext):
        self.run_context = run_context

    @abstractmethod
    def prepare_inputs(self):
        pass

    @abstractmethod
    def build_config(self) -> dict:
        pass

    @abstractmethod
    def build_frontend_output(self) -> dict:
        pass
