import yaml

from app.core.config import UPLOAD_DIR, UPLOAD_ZIP_FILENAME
from app.services.tools_service import resolve_config
from app.tools.adapters.base import ToolAdapter
from app.tools.manifests.staig import STAIG_PARAMS
from app.utils.visium import merge_predictions_and_coords, get_color_mapped_domain
from app.utils.zip_utils import extract_zip


class StaigAdapter(ToolAdapter):

    def prepare_inputs(self, dataset_id: str):
        zip_dir = UPLOAD_DIR / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
        target_dir = self.workspace["input"]

        target_dir.mkdir(parents=True, exist_ok=True)

        extract_zip(zip_dir, target_dir)

    def build_config(self, user_params: dict) -> dict:
        resolved_params = resolve_config(STAIG_PARAMS, user_params)

        config_path = self.workspace["config"] / "config.yml"
        with open(config_path, "w") as f:
            yaml.safe_dump(resolved_params, f, sort_keys=False)


    def build_frontend_output(self, job_id: str) -> dict:
        prediction_file = self.workspace["output"] / "predictions.csv"
        coords_file = self.workspace["input"] / "spatial" / "tissue_positions_list.csv"

        spots = merge_predictions_and_coords(prediction_file, coords_file)
        domains = get_color_mapped_domain(spots)

        return {
            "jobId": job_id,
            "spots": spots,
            "domains": domains
        }