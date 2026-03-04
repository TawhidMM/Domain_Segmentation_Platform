import json

from app.core.config import settings
from app.services.tool_executor import get_segmentation_metrics
from app.services.tools_service import resolve_config
from app.services.upload_service import UPLOAD_ZIP_FILENAME
from app.tools.adapters.base import ToolAdapter
from app.tools.manifests.deepst import DEEPST_MANIFEST
from app.utils.visium import merge_predictions_and_coords, get_color_mapped_domain, read_scale_factors, get_histology_image_path
from app.utils.zip_utils import extract_zip


class DeepStAdapter(ToolAdapter):

    def prepare_inputs(self, dataset_id: str):
        zip_dir = settings.UPLOAD_ROOT / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
        target_dir = self.workspace.input_dir

        target_dir.mkdir(parents=True, exist_ok=True)

        extract_zip(zip_dir, target_dir)

    def build_config(self, user_params: dict) -> dict:
        resolved_params = resolve_config(DEEPST_MANIFEST, user_params)

        self.workspace.config_dir.mkdir(parents=True, exist_ok=True)

        config_path = self.workspace.config_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump(resolved_params, f, sort_keys=False, indent=4)


    def build_frontend_output(self, job_id: str, tool_name: str) -> dict:
        prediction_file = self.workspace.output_dir / "predictions.csv"
        spatial_dir = self.workspace.input_dir / "spatial"
        coords_file = spatial_dir / "tissue_positions_list.csv"
        embeddings_file = self.workspace.output_dir / "embeddings.csv"

        # Read scale factors for high-resolution coordinate scaling
        scale_factors = read_scale_factors(spatial_dir)

        metrics = get_segmentation_metrics(prediction_file, coords_file, embeddings_file)
        result_path = self.workspace.metrics_file
        with open(result_path, "w") as f:
            json.dump(metrics, f)

        spots = merge_predictions_and_coords(prediction_file, coords_file, scale_factors)
        domains = get_color_mapped_domain(spots)

        # Check for histology image
        histology_path, histology_type = get_histology_image_path(spatial_dir)
        has_histology = histology_path is not None

        return {
            "jobId": job_id,
            "toolName": tool_name,
            "spots": spots,
            "domains": domains,
            "has_histology": has_histology
        }