import json
import subprocess
import yaml

from app.core.config import settings
from app.core.workspace import RunContext
from app.services.tools_service import resolve_config
from app.tools.registry import TOOLS
from app.utils.metrics import get_segmentation_metrics
from app.utils.visium import merge_predictions_and_coords, get_color_mapped_domain, read_scale_factors, \
    get_histology_image_path


# def run_tool(run_context: RunContext):
#     tool = TOOLS[run_context.tool_name.lower()]
#
#     container_workspace = settings.CONTAINER_WORKSPACE_PATH
#     container_data_dir = settings.CONTAINER_DATA_DIR
#     container_annotation_file = settings.CONTAINER_ANNOTATION_FILE
#
#     cmd = [
#         "docker", "run", "--rm",
#         "--gpus", "all",
#         "-v", f"{run_context.absolute_workspace_path}:{container_workspace}",
#         "-v", f"{run_context.absolute_dataset_path}:{container_data_dir}",
#     ]
#
#     if run_context.absolute_annotation_file_path is not None:
#         cmd.extend(["-v", f"{run_context.absolute_annotation_file_path}:{container_annotation_file}"])
#
#     cmd.extend(
#         [
#             "-v", f"/mnt/Drive E/Class Notes/L-4 T-2/Project/docker/scribbledom/run_pipeline.py:/runner/run_pipeline.py",
#             "-v", f"/mnt/Drive E/Class Notes/L-4 T-2/Project/docker/scribbledom/scribbledom_adapter.py:/runner/scribbledom_adapter.py",
#             tool["image"],
#             "python3", "/runner/run_pipeline.py"
#         ]
#     )
#
#
#     run_docker(cmd, run_context.logs_dir)
#
#     result = build_output(run_context)
#
#     run_context.result_file.write_text(json.dumps(result, indent=2))


class ToolExecutor:
    def __init__(self, context: RunContext):
        self.run_context = context
        self.tool = TOOLS.get(self.run_context.tool_name.lower())


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
            "-v", f"/mnt/Drive E/Class Notes/L-4 T-2/Project/docker/scribbledom/run_pipeline.py:/runner/run_pipeline.py",
            "-v", f"/mnt/Drive E/Class Notes/L-4 T-2/Project/docker/scribbledom/scribbledom_adapter.py:/runner/scribbledom_adapter.py",
            self.tool["image"],
            "python3", "/runner/run_pipeline.py",
        ]

        subprocess.run(cmd, check=True)


    def _format_tool_prediction(self) -> None:
        prediction_file = self.run_context.output_dir / "predictions.csv"

        spatial_dir = self.run_context.dataset_path / "spatial"
        coords_file = spatial_dir / "tissue_positions_list.csv"

        scale_factors = read_scale_factors(spatial_dir)

        spots = merge_predictions_and_coords(prediction_file, coords_file, scale_factors)
        domains = get_color_mapped_domain(spots)

        histology_path, histology_type = get_histology_image_path(spatial_dir)
        has_histology = histology_path is not None

        result = {
            "jobId": self.run_context.run_id,
            "toolName": self.run_context.tool_name,
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

        self._prepare_config()
        self._execute_docker()
        self._format_tool_prediction()
        self._create_metrics_file()




