# import json
# import shutil
# from pathlib import Path
#
# from app.core.config import settings
# from app.services.tools_service import resolve_config
# from app.services.upload_service import UPLOAD_ZIP_FILENAME
# from app.tools.adapters.base import ToolAdapter
# from app.tools.manifests.scribbledom import SCRIBBLEDOM_MANIFEST
# from app.dataset.visium import VisiumDataset
# from app.utils.zip_utils import extract_zip
#
#
# class ScribbleDomAdapter(ToolAdapter):
#     PREPROCESSED_DATA_FOLDER = "processed_data"
#     MATRIX_REP_OF_ST_DATA_FOLDER = "matrix_representation"
#     MODEL_OUTPUT_FOLDER = "model_outputs"
#     FINAL_OUTPUT_FOLDER = "final_outputs"
#     DATASET = "dataset_001"
#     SAMPLE = "sample_001"
#
#
#     def prepare_inputs(self):
#         dataset_id = self.run_context.dataset_id
#         zip_dir = settings.UPLOAD_ROOT / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
#         target_dir = (self.run_context.dataset_path /
#                       self.DATASET / self.SAMPLE)
#
#         target_dir.mkdir(parents=True, exist_ok=True)
#
#         extract_zip(zip_dir, target_dir)
#
#         self._normalize_h5_filename(target_dir)
#
#     def build_config(self):
#         pass
#
#
#     def _normalize_h5_filename(self, target_dir: Path):
#         expected_name = f"{self.SAMPLE}_filtered_feature_bc_matrix.h5"
#         dst = target_dir / expected_name
#
#         for f in target_dir.iterdir():
#             if f.name.lower().endswith("matrix.h5"):
#                 if f.name != expected_name:
#                     if dst.exists():
#                         dst.unlink()
#
#                     f.rename(dst)
#
#                 return
#
#         raise FileNotFoundError(f"Matrix file ending in '_filtered_feature_bc_matrix.h5' "
#                                 f"not found in {target_dir.name}")
#
#
#     def build_frontend_output(self) -> dict:
#         base_dir = (
#                 self.run_context.output_dir
#                 / self.FINAL_OUTPUT_FOLDER
#                 / self.DATASET
#                 / self.SAMPLE
#         )
#
#         csv_files = list(base_dir.rglob("final_barcode_labels.csv"))
#         if not csv_files:
#             raise FileNotFoundError("No prediction CSV found in ScribbleDom output")
#
#         prediction_file = csv_files[0]
#
#         dataset_base = self.run_context.dataset_path
#
#         coords_file = (
#                 dataset_base
#                 / self.DATASET
#                 / self.SAMPLE
#                 / "spatial"
#                 / "tissue_positions_list.csv")
#
#         spatial_dir = (
#                 dataset_base
#                 / self.DATASET
#                 / self.SAMPLE
#                 / "spatial")
#
#         visium = VisiumDataset()
#
#         # Read scale factors for high-resolution coordinate scaling
#         scale_factors = visium.read_scale_factors(spatial_dir)
#
#         spots = visium.merge_predictions_and_coords(prediction_file, coords_file, scale_factors)
#         domains = visium.get_color_mapped_domain(spots)
#
#         # Check for histology image
#         histology_path, histology_type = visium.get_histology_image_path(spatial_dir)
#         has_histology = histology_path is not None
#
#         return {
#             "jobId": self.run_context.run_id,
#             "toolName": self.run_context.tool_name,
#             "spots": spots,
#             "domains": domains,
#             "has_histology": has_histology
#         }