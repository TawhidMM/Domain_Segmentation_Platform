from pydantic import BaseModel
from typing import Dict, Any, List, Optional


class ParameterDefinition(BaseModel):
    type: str
    label: str
    ui_group: str
    options: Optional[List[Any]] = None
    min: Optional[float] = None
    max: Optional[float] = None
    default: Optional[Any] = None
    depends_on: Optional[Dict[str, List[str]]] = None


class ProfileDefinition(BaseModel):
    overrides: Dict[str, Any]
    internal_params: Dict[str, Any]


class ToolManifest(BaseModel):
    tool_id: str
    label: str
    description: str

    parameters: Dict[str, ParameterDefinition]

    profiles: Dict[str, ProfileDefinition]


class FrontendToolSchema(BaseModel):
    tool_id: str
    label: str
    description: str
    parameters: Dict[str, ParameterDefinition]

    profiles: Dict[str, Dict[str, Dict[str, Any]]]
