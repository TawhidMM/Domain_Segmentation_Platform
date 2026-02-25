import importlib

from app.core.workspace import Workspace


def load_adapter(adapter_path: str, workspace: Workspace):
    """
    Dynamically load and instantiate a tool adapter.

    Args:
        adapter_path: Module path to adapter class (e.g., "app.tools.adapters.staig.StaigAdapter")
        workspace: Workspace object containing directory paths

    Returns:
        Instantiated adapter object
    """
    module_path, class_name = adapter_path.rsplit(".", 1)
    module = importlib.import_module(module_path)

    cls = getattr(module, class_name)

    return cls(workspace)
