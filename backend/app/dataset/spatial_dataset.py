from abc import ABC, abstractmethod
from pathlib import Path

import glasbey
import numpy as np
import spaco
from PIL import Image


class SpatialDataset(ABC):
    @abstractmethod
    def validate_dataset(self, extracted_dir: Path) -> None:
        pass

    @abstractmethod
    def resolve_spatial_dir(self, dataset_dir: Path) -> Path:
        pass

    @abstractmethod
    def resolve_coordinates_file(self, spatial_dir: Path) -> Path:
        pass

    @abstractmethod
    def read_scale_factors(self, spatial_dir: Path) -> dict:
        pass

    @abstractmethod
    def read_predictions(self, prediction_file: Path) -> dict:
        pass

    @abstractmethod
    def read_coordinates(self, coord_file: Path, scale_factors: dict | None = None) -> dict:
        pass

    @abstractmethod
    def get_histology_image_path(self, spatial_dir: Path) -> tuple[Path | None, str | None]:
        pass

    def merge_predictions_and_coords(
        self,
        predictions_file: Path,
        coords_file: Path,
        scale_factors: dict | None = None,
    ) -> list:
        pred = self.read_predictions(predictions_file)
        coords = self.read_coordinates(coords_file, scale_factors)

        spots = []
        for barcode, domain in pred.items():
            if barcode not in coords:
                continue

            x, y = coords[barcode]
            spots.append({
                "barcode": barcode,
                "x": x,
                "y": y,
                "domain": domain,
            })

        return spots

    def generate_domain_colors(self, spots: list) -> dict:
        domain_ids = sorted({s["domain"] for s in spots})
        n = len(domain_ids)

        palette = glasbey.create_palette(
            palette_size=n,
            colorblind_safe=True,
            lightness_bounds=(25, 75)
        )

        cell_coordinates = np.array([[s["x"], s["y"]] for s in spots])
        cell_labels = np.array([s["domain"] for s in spots])

        # Step 3: Optimally assign colors using spatial proximity
        return spaco.colorize(
            cell_coordinates=cell_coordinates,
            cell_labels=cell_labels,
            colorblind_type="none",
            palette=list(palette),
            radius=50,
            n_neighbors=30,
        )

    def get_color_mapped_domain(self, spots: list) -> list:
        color_map = self.generate_domain_colors(spots)

        return [
            {"domain_id": domain_id, "color": color_map[domain_id]}
            for domain_id in sorted(color_map.keys())
        ]

    def get_image_size(self, image_path: Path) -> tuple[int, int]:
        with Image.open(image_path) as image:
            return image.size