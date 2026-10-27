import json
import logging
import subprocess
from datetime import datetime, timezone

import yaml

from app.exceptions.tool_execution_exception import RunErrorCode, RunExecutionError, DockerExecutionError
from app.core.config import settings
from app.core.workspace import RunContext
from app.services.tools_service import resolve_config
from app.tools.tool_registry import get_registry
from app.schemas.tool import Tool
from app.utils.metrics import get_segmentation_metrics
from app.dataset.visium import VisiumDataset

logger = logging.getLogger(__name__)


class ToolExecutor:
    def __init__(self, context: RunContext):
        self.run_context = context


    def _resolve_tool(self):
        try:
            loaded_tool = get_registry().get(self.run_context.tool_id)
            self.tool: Tool = Tool(
                image=loaded_tool.spec.image,
                config_file=loaded_tool.spec.config_file,
                manifest=loaded_tool.manifest,
            )
        except Exception as exc:
            raise RunExecutionError(
                RunErrorCode.TOOL_NOT_FOUND,
                "Tool not found",
            ) from exc

    def _prepare_config(self):
        try:
            resolved_params = resolve_config(self.tool.manifest, user_input=self.run_context.params)
            resolved_params["seed"] = self.run_context.seed

            self.run_context.config_dir.mkdir(parents=True, exist_ok=True)

            config_path = self.run_context.config_dir / self.tool.config_file

            if config_path.suffix == ".yml" or config_path.suffix == ".yaml":
                with open(config_path, "w") as f:
                    yaml.dump(resolved_params, f)
            else:
                with open(config_path, "w") as f:
                    json.dump(resolved_params, f, indent=4)
        except Exception as exc:

            logger.exception("Failed to prepare configuration for run %s", self.run_context.run_id)

            raise RunExecutionError(
                RunErrorCode.CONFIG_PREPARATION_FAILED,
                "Failed to prepare tool configuration",
            ) from exc


    def _build_docker_command(self) -> list[str]:
        volumes = [
            f"{self.run_context.absolute_workspace_path}:{settings.CONTAINER_WORKSPACE_PATH}",
            f"{self.run_context.absolute_dataset_path}:{settings.CONTAINER_DATASET_PATH}:ro"
        ]

        if self.run_context.absolute_annotation_file_path is not None:
            volumes.append(f"{self.run_context.absolute_annotation_file_path}:{settings.CONTAINER_ANNOTATION_PATH}:ro")

        return [
            "docker", "run", "--rm", "--gpus", "all",
            *[flag for v in volumes for flag in ("-v", v)],
            self.tool.image
        ]


    def _run_tool_container(self) -> None:
        command = self._build_docker_command()

        try:
            self._run_container_process(command)

        except DockerExecutionError as exc:
            if exc.return_code in (125, 126, 127):
                code = RunErrorCode.CONTAINER_START_FAILED
                message = "Container failed to start (docker, GPU, image or entrypoint problem)"
            elif exc.return_code == 137 or (exc.return_code is not None and exc.return_code < 0):
                code = RunErrorCode.CONTAINER_KILLED
                message = "Container was killed (often out of memory)"
            else:
                code = RunErrorCode.TOOL_FAILED
                message = f"Tool exited with code {exc.return_code}"

            logger.exception("Docker execution failed for run %s", self.run_context.run_id)
            raise RunExecutionError(code, message, exit_code=exc.return_code) from exc
        except (FileNotFoundError, OSError) as exc:
            logger.exception("Failed to start Docker for run %s", self.run_context.run_id)
            raise RunExecutionError(
                RunErrorCode.CONTAINER_START_FAILED,
                "Container failed to start (docker, GPU, image or entrypoint problem)",
            ) from exc

    def _run_container_process(self, command: list[str]) -> None:
        logs_dir = self.run_context.logs_dir
        logs_dir.mkdir(parents=True, exist_ok=True)

        stdout_path = logs_dir / "docker_stdout.log"
        stderr_path = logs_dir / "docker_stderr.log"
        execution_path = logs_dir / "execution.json"

        started_at = datetime.now(timezone.utc)
        return_code = None

        try:
            with stdout_path.open("wb") as stdout_file, stderr_path.open("wb") as stderr_file:
                process = subprocess.Popen(
                    command,
                    stdout=stdout_file,
                    stderr=stderr_file,
                )
                return_code = process.wait()
        except (FileNotFoundError, OSError):
            execution_path.write_text(json.dumps({
                "command": command,
                "return_code": None,
                "started_at": started_at.isoformat(),
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }, indent=4))
            raise

        execution_path.write_text(json.dumps({
            "command": command,
            "return_code": return_code,
            "started_at": started_at.isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }, indent=4))

        if return_code != 0:
            raise DockerExecutionError(
                "Tool execution failed. Check docker_stderr.log",
                return_code=return_code,
            )


    def _format_tool_prediction(self) -> None:
        prediction_file = self.run_context.output_dir / "predictions.csv"

        if not prediction_file.is_file() or prediction_file.stat().st_size == 0:
            raise RunExecutionError(
                RunErrorCode.OUTPUT_MISSING,
                "Tool finished but produced no predictions.csv",
            )

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
        self._run_tool_container()
        self._post_process()


    def posst_process_result(self) -> None:
        self._post_process()


    def _post_process(self) -> None:
        try:
            self._format_tool_prediction()
            self._create_metrics_file()
        except Exception as exc:
            logger.exception("Failed to process output for run %s", self.run_context.run_id)
            raise RunExecutionError(
                RunErrorCode.POST_PROCESSING_FAILED,
                "Failed to process tool output",
            ) from exc