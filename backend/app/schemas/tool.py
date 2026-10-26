import logging
import re
from typing import Any, Literal, TypeAlias, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator


logger = logging.getLogger(__name__)
TOOL_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


class ToolSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=TOOL_ID_PATTERN.pattern)
    name: str
    version: str
    image: str
    config_file: str
    source: str | None = None


class ParameterBase(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    label: str | None = None
    default: Any = None
    ui_group: str | None = None
    depends_on: dict[str, list[Any]] | None = None


class EnumParameter(ParameterBase):
    type: Literal["enum"]
    options: list[Any]

    @model_validator(mode="after")
    def warn_about_invalid_default(self) -> "EnumParameter":
        if self.default is not None and self.default not in self.options:
            logger.warning(
                "Enum parameter default %r is not one of its options %r",
                self.default,
                self.options,
            )
        return self


class IntParameter(ParameterBase):
    type: Literal["int"]
    min: int | None = None
    max: int | None = None


class FloatParameter(ParameterBase):
    type: Literal["float"]


class FloatRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min: float
    max: float
    step: float


class FloatRangeParameter(ParameterBase):
    type: Literal["float_range"]
    default: FloatRange | None = None
    ui: FloatRange | None = None


class FloatListParameter(ParameterBase):
    type: Literal["float_list"]
    default: list[float] | None = None


Parameter: TypeAlias = Union[
    EnumParameter,
    IntParameter,
    FloatParameter,
    FloatRangeParameter,
    FloatListParameter,
]


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overrides: dict[str, Any] = {}
    internal_params: dict[str, Any] = {}


class ToolManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
    requirements: dict[str, Any] | None = None
    parameters: dict[str, Parameter]
    profiles: dict[str, Profile]


class Tool(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image: str
    config_file: str
    manifest: dict[str, Any]
