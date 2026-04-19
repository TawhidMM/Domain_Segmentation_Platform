import importlib

from app.core.workspace import RunContext


def load_adapter(adapter_path: str, run_context: RunContext):

    module_path, class_name = adapter_path.rsplit(".", 1)
    module = importlib.import_module(module_path)

    cls = getattr(module, class_name)

    return cls(run_context)
