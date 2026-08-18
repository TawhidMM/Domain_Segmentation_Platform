from enum import Enum
from typing import TypedDict


class ToolRegistryKey(str, Enum):
    SCRIBBLEDOM = "ScribbleDom"
    STAIG = "STAIG"
    DEEPST = "DeepST"


class ToolManifest(TypedDict):
    description: str
    requirements: dict
    parameters: dict
    profiles: dict


class ToolConfig(TypedDict):
    image: str
    config_file: str
    manifest_module: str
    manifest_attr: str


class Tool(ToolConfig):
    manifest: ToolManifest
