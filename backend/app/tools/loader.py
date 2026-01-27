import importlib

def load_adapter(adapter_path: str, workspace: dict):
    module_path, class_name = adapter_path.rsplit(".", 1)
    module = importlib.import_module(module_path)

    cls = getattr(module, class_name)

    return cls(workspace)
