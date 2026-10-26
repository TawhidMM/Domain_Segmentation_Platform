from pathlib import Path

import yaml
import pytest

from app.tools.tool_registry import ToolRegistry


MANIFEST = {
    "description": "Test tool",
    "parameters": {
        "mode": {
            "type": "enum",
            "options": ["a", "b"],
            "default": "a",
        }
    },
    "profiles": {"default": {"overrides": {}, "internal_params": {}}},
}


def write_package(root: Path, directory: str, tool_id: str | None = None) -> None:
    package = root / directory
    package.mkdir()
    (package / "tool.yaml").write_text(
        yaml.safe_dump(
            {
                "id": tool_id or directory,
                "name": directory,
                "version": "1.0.0",
                "image": f"example/{directory}:1",
                "config_file": "config.json",
            }
        )
    )
    (package / "manifest.yaml").write_text(yaml.safe_dump(MANIFEST))


def test_valid_package_loads(tmp_path: Path):
    write_package(tmp_path, "Example")

    tool = ToolRegistry(tmp_path).get("Example")

    assert tool.spec.id == "Example"
    assert tool.manifest == MANIFEST


def test_id_directory_mismatch_is_rejected(tmp_path: Path):
    write_package(tmp_path, "Example", tool_id="Other")

    registry = ToolRegistry(tmp_path)

    assert registry.list() == []
    assert "does not match directory name" in registry.validation_errors()["Example"]


def test_missing_manifest_is_rejected(tmp_path: Path):
    package = tmp_path / "Example"
    package.mkdir()
    (package / "tool.yaml").write_text(
        yaml.safe_dump(
            {
                "id": "Example",
                "name": "Example",
                "version": "1.0.0",
                "image": "example/tool:1",
                "config_file": "config.json",
            }
        )
    )

    registry = ToolRegistry(tmp_path)

    assert "missing manifest.yaml" in registry.validation_errors()["Example"]


def test_invalid_slug_is_rejected(tmp_path: Path):
    write_package(tmp_path, "bad.slug")

    registry = ToolRegistry(tmp_path)

    assert "String should match pattern" in registry.validation_errors()["bad.slug"]


def test_unknown_tool_error_lists_valid_ids(tmp_path: Path):
    write_package(tmp_path, "Example")

    with pytest.raises(ValueError, match=r"Valid options: \['Example'\]"):
        ToolRegistry(tmp_path).get("Missing")


def test_case_insensitive_collision_is_rejected(tmp_path: Path):
    write_package(tmp_path, "Example")
    write_package(tmp_path, "example")

    registry = ToolRegistry(tmp_path)

    assert registry.list() == []
    assert "case-insensitive tool ID collision" in registry.validation_errors()["Example"]
    assert "case-insensitive tool ID collision" in registry.validation_errors()["example"]


def test_invalid_package_is_skipped_at_runtime_and_reported(tmp_path: Path):
    write_package(tmp_path, "Valid")
    write_package(tmp_path, "Invalid", tool_id="Other")

    registry = ToolRegistry(tmp_path)

    assert registry.ids() == ["Valid"]
    assert "Invalid" in registry.validation_errors()


def test_real_tool_packages_load():
    tools_dir = Path(__file__).resolve().parents[2] / "tools"

    assert ToolRegistry(tools_dir).ids() == ["DeepST", "STAIG", "ScribbleDom"]
