from __future__ import annotations

import logging
import os
import builtins
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import yaml
from pydantic import ValidationError

from app.schemas.tool import ToolManifest, ToolSpec


logger = logging.getLogger(__name__)
REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_DIR = Path(os.environ.get("TOOLS_DIR", REPO_ROOT / "tools"))


@dataclass(frozen=True)
class LoadedTool:
    spec: ToolSpec
    manifest: dict[str, Any]


class ToolPackageError(ValueError):
    pass


class ToolRegistry:
    def __init__(self, tools_dir: Path | str = TOOLS_DIR):
        self.tools_dir = Path(tools_dir)
        self._lock = Lock()
        self._loaded: dict[str, LoadedTool] | None = None
        self._errors: dict[str, str] | None = None


    def _load_package(self, directory: Path) -> LoadedTool:
        tool_path = directory / "tool.yaml"
        manifest_path = directory / "manifest.yaml"
        if not tool_path.is_file():
            raise ToolPackageError("missing tool.yaml")
        if not manifest_path.is_file():
            raise ToolPackageError("missing manifest.yaml")

        with tool_path.open(encoding="utf-8") as file:
            tool_data = yaml.safe_load(file)
        with manifest_path.open(encoding="utf-8") as file:
            manifest_data = yaml.safe_load(file)

        spec = ToolSpec.model_validate(tool_data)
        if spec.id != directory.name:
            raise ToolPackageError(
                f"id {spec.id!r} does not match directory name {directory.name!r}"
            )

        manifest = ToolManifest.model_validate(manifest_data)

        return LoadedTool(
            spec=spec,
            manifest=manifest.model_dump(exclude_none=True, mode="python"),
        )



    def _scan(self) -> tuple[dict[str, LoadedTool], dict[str, str]]:
        loaded: dict[str, LoadedTool] = {}
        errors: dict[str, str] = {}
        if not self.tools_dir.is_dir():
            return {}, {str(self.tools_dir): "tools directory does not exist"}

        candidates = sorted(
            (path for path in self.tools_dir.iterdir() if path.is_dir()),
            key=lambda path: path.name,
        )

        for directory in candidates:
            try:
                tool = self._load_package(directory)
                loaded[tool.spec.id] = tool
            except (OSError, TypeError, ValueError, ValidationError, yaml.YAMLError) as exc:
                reason = str(exc)
                errors[directory.name] = reason
                logger.error("Skipping invalid tool package %s: %s", directory, reason)

        collisions: dict[str, list[str]] = {}
        for tool_id in loaded:
            collisions.setdefault(tool_id.casefold(), []).append(tool_id)
        for ids in collisions.values():
            if len(ids) > 1:
                reason = f"case-insensitive tool ID collision: {ids}"
                for tool_id in ids:
                    errors[tool_id] = reason
                    loaded.pop(tool_id, None)
                logger.error("%s", reason)

        return loaded, errors


    def _ensure_loaded(self) -> None:
        if self._loaded is not None:
            return
        with self._lock:
            if self._loaded is None:
                self._loaded, self._errors = self._scan()


    def get(self, tool_id: str) -> LoadedTool:
        self._ensure_loaded()
        assert self._loaded is not None

        if tool_id not in self._loaded:
            valid_ids = sorted(self._loaded)
            raise ValueError(
                f"Tool {tool_id!r} is not registered. Valid options: {valid_ids}"
            )

        return self._loaded[tool_id]


    def list(self) -> builtins.list[LoadedTool]:
        self._ensure_loaded()
        assert self._loaded is not None

        return list(self._loaded.values())


    def ids(self) -> builtins.list[str]:
        return [tool.spec.id for tool in self.list()]


    def images(self) -> builtins.list[str]:
        return [tool.spec.image for tool in self.list()]


    def validation_errors(self) -> dict[str, str]:
        self._ensure_loaded()
        assert self._errors is not None
        return dict(self._errors)


_registry = ToolRegistry()


def get_registry() -> ToolRegistry:
    return _registry
