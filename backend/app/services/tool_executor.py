import json
import subprocess

import yaml

from app.core.config import settings
from app.core.workspace import RunContext
from app.services.tools_service import resolve_config
from app.tools.tool_registry import TOOL_REGISTRY, get_tool_manifest
from app.schemas.tool import ToolRegistryKey, Tool
from app.utils.metrics import get_segmentation_metrics
from app.dataset.visium import VisiumDataset


class ToolExecutor:
    def __init__(self, context: RunContext):
        self.run_context = context


    def _resolve_tool(self):
        try:
            tool_key = ToolRegistryKey(self.run_context.tool_id)

            tool_config = TOOL_REGISTRY[tool_key]
            manifest = get_tool_manifest(tool_key)

            self.tool: Tool = {**tool_config, "manifest": manifest}

        except (ValueError, KeyError):
            valid_keys = [key.value for key in ToolRegistryKey]
            raise ValueError(
                f"Tool '{self.run_context.tool_id}' is not registered. "
                f"Valid options: {valid_keys}"
            )

    def _prepare_config(self):
        resolved_params = resolve_config(self.tool["manifest"], user_input=self.run_context.params)
        resolved_params["seed"] = self.run_context.seed

        self.run_context.config_dir.mkdir(parents=True, exist_ok=True)

        config_path = self.run_context.config_dir / self.tool["config_file"]

        if config_path.suffix == ".yml" or config_path.suffix == ".yaml":
            with open(config_path, "w") as f:
                yaml.dump(resolved_params, f)
        else:
            with open(config_path, "w") as f:
                json.dump(resolved_params, f, indent=4)

    def _execute_docker(self):
        volumes = [
            f"{self.run_context.absolute_workspace_path}:{settings.CONTAINER_WORKSPACE_PATH}",
            f"{self.run_context.absolute_dataset_path}:{settings.CONTAINER_DATASET_PATH}:ro"
        ]

        if self.run_context.absolute_annotation_file_path is not None:
            volumes.append(f"{self.run_context.absolute_annotation_file_path}:{settings.CONTAINER_ANNOTATION_PATH}:ro")

        cmd = [
            "docker", "run", "--rm", "--gpus", "all",
            *[flag for v in volumes for flag in ("-v", v)],
            self.tool["image"]
        ]

        subprocess.run(cmd, check=True)

    def _format_tool_prediction(self) -> None:
        prediction_file = self.run_context.output_dir / "predictions.csv"

        spatial_dir = self.run_context.dataset_path / "spatial"
        coords_file = spatial_dir / "tissue_positions_list.csv"

        visium = VisiumDataset()
        scale_factors = visium.read_scale_factors(spatial_dir)

        spots = visium.merge_predictions_and_coords(prediction_file, coords_file, scale_factors)
        domains = visium.get_color_mapped_domain(spots)

        histology_path, histology_type = visium.get_histology_image_path(spatial_dir)
        has_histology = histology_path is not None

        result = {
            "runId": self.run_context.run_id,
            "experimentName": self.run_context.experiment_name,
            "spots": spots,
            "domains": domains,
            "has_histology": has_histology
        }

        self.run_context.result_file.write_text(json.dumps(result, indent=4))

    def _create_metrics_file(self) -> None:
        prediction_file = self.run_context.output_dir / "predictions.csv"
        coords_file = self.run_context.dataset_path / "spatial" / "tissue_positions_list.csv"
        embeddings_file = self.run_context.embeddings_file

        metrics = get_segmentation_metrics(prediction_file, coords_file, embeddings_file)
        with open(self.run_context.metrics_file, "w") as f:
            json.dump(metrics, f)


    def execute(self):
        self._resolve_tool()
        self._prepare_config()
        self._execute_docker()
        self._format_tool_prediction()
        self._create_metrics_file()


    def posst_process_result(self) -> None:
        self._format_tool_prediction()
        self._create_metrics_file()