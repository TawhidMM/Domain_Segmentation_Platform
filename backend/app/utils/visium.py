import csv
import json
from pathlib import Path

from app.utils.dataset import SpatialDataset


class VisiumDataset(SpatialDataset):
    REQUIRED = ["filtered_feature_bc_matrix", "spatial"]

    def validate_visium_input(self, input_dir: Path) -> None:
        for name in self.REQUIRED:
            if not (input_dir / name).exists():
                raise ValueError(
                    f"Invalid Visium input: missing '{name}'. "
                    "Please upload a standard Space Ranger output directory."
                )

    def validate_input(self, input_dir: Path) -> None:
        # Alias kept for semantic readability in generic dataset flows.
        self.validate_visium_input(input_dir)

    def resolve_spatial_dir(self, dataset_dir: Path) -> Path:
        spatial_dir = dataset_dir / "spatial"
        if spatial_dir.exists():
            return spatial_dir

        possible_paths = list(dataset_dir.rglob("spatial"))
        if possible_paths:
            return possible_paths[0]

        raise FileNotFoundError("No spatial directory found")

    def resolve_coordinates_file(self, spatial_dir: Path) -> Path:
        candidate_files = [
            spatial_dir / "tissue_positions_list.csv",
            spatial_dir / "tissue_positions.csv",
        ]

        for candidate in candidate_files:
            if candidate.exists():
                return candidate

        raise FileNotFoundError("No tissue positions file found in spatial directory")

    def read_scale_factors(self, spatial_dir: Path) -> dict:
        scale_file = spatial_dir / "scalefactors_json.json"

        if not scale_file.exists():
            raise FileNotFoundError(
                f"Scale factors file not found at {scale_file}. "
                "Expected 'scalefactors_json.json' in spatial directory."
            )

        with scale_file.open("r") as f:
            return json.load(f)

    def read_predictions(self, prediction_file: Path) -> dict:
        pred_map = {}

        with prediction_file.open(newline="") as f:
            reader = csv.reader(f)
            next(reader)

            for row in reader:
                if len(row) < 2:
                    continue

                barcode = row[0].strip()
                domain = int(row[1])
                pred_map[barcode] = domain

        return pred_map

    def read_coordinates(self, coord_file: Path, scale_factors: dict | None = None) -> dict:
        coord_map = {}

        scale_factor = 1.0
        if scale_factors and "tissue_hires_scalef" in scale_factors:
            scale_factor = float(scale_factors["tissue_hires_scalef"])

        with coord_file.open(newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) < 6:
                    continue

                if str(row[1]).strip() == "0":
                    continue

                barcode = row[0].strip()
                pxl_col = float(row[5])
                pxl_row = float(row[4])

                coord_map[barcode] = (
                    pxl_col * scale_factor,
                    pxl_row * scale_factor,
                )

        return coord_map

    def get_histology_image_path(self, spatial_dir: Path) -> tuple[Path | None, str | None]:
        hires_image = spatial_dir / "tissue_hires_image.png"
        lowres_image = spatial_dir / "tissue_lowres_image.png"

        if hires_image.exists():
            return hires_image, "hires"
        if lowres_image.exists():
            return lowres_image, "lowres"

        return None, None


_VISIUM_DATASET = VisiumDataset()


def validate_visium_input(input_dir: Path):
    _VISIUM_DATASET.validate_visium_input(input_dir)


def resolve_spatial_dir(dataset_dir: Path) -> Path:
    return _VISIUM_DATASET.resolve_spatial_dir(dataset_dir)


def resolve_coordinates_file(spatial_dir: Path) -> Path:
    return _VISIUM_DATASET.resolve_coordinates_file(spatial_dir)


def read_scale_factors(spatial_dir: Path) -> dict:
    return _VISIUM_DATASET.read_scale_factors(spatial_dir)


def read_predictions(prediction_file: Path) -> dict:
    return _VISIUM_DATASET.read_predictions(prediction_file)


def read_coordinates(coord_file: Path, scale_factors: dict = None) -> dict:
    return _VISIUM_DATASET.read_coordinates(coord_file, scale_factors)


def merge_predictions_and_coords(
    predictions_file: Path,
    coords_file: Path,
    scale_factors: dict = None,
) -> list:
    return _VISIUM_DATASET.merge_predictions_and_coords(
        predictions_file,
        coords_file,
        scale_factors,
    )


def generate_domain_colors(spots: list) -> dict:
    return _VISIUM_DATASET.generate_domain_colors(spots)


def get_color_mapped_domain(spots: list) -> list:
    return _VISIUM_DATASET.get_color_mapped_domain(spots)


def get_histology_image_path(spatial_dir: Path) -> tuple[Path | None, str | None]:
    return _VISIUM_DATASET.get_histology_image_path(spatial_dir)


def get_image_size(image_path: Path) -> tuple[int, int]:
    return _VISIUM_DATASET.get_image_size(image_path)
