# import json
#
# import yaml
#
# from app.core.config import settings
# from app.services.tool_executor import get_segmentation_metrics
# from app.services.tools_service import resolve_config
# from app.services.upload_service import UPLOAD_ZIP_FILENAME
# from app.tools.adapters.base import ToolAdapter
# from app.tools.manifests.staig import STAIG_MANIFESTS
# from app.dataset.visium import VisiumDataset
# from app.utils.zip_utils import extract_zip
#
#
# class StaigAdapter(ToolAdapter):
#
#     def prepare_inputs(self):
#         dataset_id = self.run_context.dataset_id
#         zip_dir = settings.UPLOAD_ROOT / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
#         target_dir = self.run_context.dataset_path
#
#         target_dir.mkdir(parents=True, exist_ok=True)
#
#         extract_zip(zip_dir, target_dir)
#
#     def build_config(self):
#         pass
#
#
#     def build_frontend_output(self) -> dict:
#         prediction_file = self.run_context.output_dir / "predictions.csv"
#
#         spatial_dir = self.run_context.dataset_path / "spatial"
#         coords_file = spatial_dir / "tissue_positions_list.csv"
#         embeddings_file = self.run_context.embeddings_file
#
#         visium = VisiumDataset()
#
#         # Read scale factors for high-resolution coordinate scaling
#         scale_factors = visium.read_scale_factors(spatial_dir)
#
#         metrics = get_segmentation_metrics(prediction_file, coords_file, embeddings_file)
#         result_path = self.run_context.metrics_file
#         with open(result_path, "w") as f:
#             json.dump(metrics, f)
#
#         spots = visium.merge_predictions_and_coords(prediction_file, coords_file, scale_factors)
#         domains = visium.get_color_mapped_domain(spots)
#
#         # Check for histology image
#         histology_path, histology_type = visium.get_histology_image_path(spatial_dir)
#         has_histology = histology_path is not None
#
#         return {
#             "runId": self.run_context.run_id,
#             "toolName": self.run_context.tool_name,
#             "spots": spots,
#             "domains": domains,
#             "has_histology": has_histology
#         }