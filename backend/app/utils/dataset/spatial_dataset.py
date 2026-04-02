from abc import ABC, abstractmethod
import colorsys
from pathlib import Path

from PIL import Image


class SpatialDataset(ABC):
    @abstractmethod
    def validate_visium_input(self, input_dir: Path) -> None:
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

        color_map = {}
        for i, domain_id in enumerate(domain_ids):
            hue = i / max(1, n)
            r, g, b = colorsys.hsv_to_rgb(hue, 0.65, 0.95)
            color_map[domain_id] = "#{:02X}{:02X}{:02X}".format(
                int(r * 255),
                int(g * 255),
                int(b * 255),
            )

        return color_map

    def get_color_mapped_domain(self, spots: list) -> list:
        color_map = self.generate_domain_colors(spots)

        return [
            {"domain_id": domain_id, "color": color_map[domain_id]}
            for domain_id in sorted(color_map.keys())
        ]

    def get_image_size(self, image_path: Path) -> tuple[int, int]:
        with Image.open(image_path) as image:
            return image.size
