import json
import shutil
from pathlib import Path

from app.core.config import settings
from app.services.tools_service import resolve_config
from app.services.upload_service import UPLOAD_ZIP_FILENAME
from app.tools.adapters.base import ToolAdapter
from app.tools.manifests.scribbledom import SCRIBBLEDOM_MANIFEST
from app.utils.visium import merge_predictions_and_coords, get_color_mapped_domain, read_scale_factors, get_histology_image_path
from app.utils.zip_utils import extract_zip


class ScribbleDomAdapter(ToolAdapter):
    PREPROCESSED_DATA_FOLDER = "processed_data"
    MATRIX_REP_OF_ST_DATA_FOLDER = "matrix_representation"
    MODEL_OUTPUT_FOLDER = "model_outputs"
    FINAL_OUTPUT_FOLDER = "final_outputs"
    DATASET = "dataset_001"
    SAMPLE = "sample_001"


    def prepare_inputs(self, dataset_id):
        zip_dir = settings.UPLOAD_DIR / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
        target_dir = (self.workspace.input_dir /
                      self.DATASET / self.SAMPLE)

        target_dir.mkdir(parents=True, exist_ok=True)

        extract_zip(zip_dir, target_dir)
        has_scribble = self._stage_manual_scribble(target_dir)

        # if self.schema == "expert" and not has_scribble:
        #     raise RuntimeError(
        #         "schema=expert requires manual_scribble.csv, but none was provided"
        #     )

        self._normalize_h5_filename(target_dir)

    def build_config(self, user_params: dict):
        resolved_params = resolve_config(manifest=SCRIBBLEDOM_MANIFEST, user_input=user_params)

        system_config = {
            "preprocessed_data_folder": self.PREPROCESSED_DATA_FOLDER,
            "matrix_represenation_of_ST_data_folder": self.MATRIX_REP_OF_ST_DATA_FOLDER,
            "model_output_folder": self.MODEL_OUTPUT_FOLDER,
            "final_output_folder": self.FINAL_OUTPUT_FOLDER,

            "space_ranger_output_directory": self.workspace.input_dir.name,
            "dataset": self.DATASET,
            "samples": [self.SAMPLE]
        }

        self.workspace.config_dir.mkdir(parents=True, exist_ok=True)

        config_path = self.workspace.config_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump({**resolved_params, **system_config}, f, indent=4)


    def _stage_manual_scribble(self, target_dir: Path):
        staged_dir = self.workspace.root_dir / "staged_inputs"
        staged_dir.mkdir(parents=True, exist_ok=True)

        for f in list(target_dir.iterdir()):
            if f.suffix.lower().endswith(".csv"):
                src = target_dir / f.name
                dst = staged_dir / "manual_scribble.csv"
                shutil.move(src, dst)
                return True

        return False

    def _normalize_h5_filename(self, target_dir: Path):
        expected_name = f"{self.SAMPLE}_filtered_feature_bc_matrix.h5"
        dst = target_dir / expected_name

        for f in target_dir.iterdir():
            if f.name.lower().endswith("_filtered_feature_bc_matrix.h5"):
                if f.name != expected_name:
                    if dst.exists():
                        dst.unlink()

                    f.rename(dst)

                return

        raise FileNotFoundError(f"Matrix file ending in '_filtered_feature_bc_matrix.h5' "
                                f"not found in {target_dir.name}")


    def build_frontend_output(self, job_id: str, tool_name: str) -> dict:
        base_dir = (
                self.workspace.output_dir
                / self.FINAL_OUTPUT_FOLDER
                / self.DATASET
                / self.SAMPLE
        )

        csv_files = list(base_dir.rglob("final_barcode_labels.csv"))
        if not csv_files:
            raise FileNotFoundError("No prediction CSV found in ScribbleDom output")

        prediction_file = csv_files[0]
        coords_file = (
                self.workspace.input_dir
                / self.DATASET
                / self.SAMPLE
                / "spatial"
                / "tissue_positions_list.csv")

        spatial_dir = (
                self.workspace.input_dir
                / self.DATASET
                / self.SAMPLE
                / "spatial")

        # Read scale factors for high-resolution coordinate scaling
        scale_factors = read_scale_factors(spatial_dir)

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