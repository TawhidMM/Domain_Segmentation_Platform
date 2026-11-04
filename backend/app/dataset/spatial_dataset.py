import csv
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import glasbey
import numpy as np
import spaco
from PIL import Image


class SpatialDataReader(ABC):
    display_spaces: tuple[str, ...] = ("native",)
    default_display_space: str = "native"

    def __init__(self, dataset_dir: Path):
        self.dataset_dir = dataset_dir

    @abstractmethod
    def validate(self) -> None:
        pass

    @abstractmethod
    def read_coordinates(self) -> dict[str, tuple[float, float]]:
        pass

    def _check_space(self, space: Optional[str]) -> str:
        space = space or self.default_display_space
        if space not in self.display_spaces:
            raise ValueError(
                f"Unsupported space {space!r}; choose from {self.display_spaces}"
            )
        return space

    def read_display_coordinates(
        self, space: Optional[str] = None
    ) -> dict[str, tuple[float, float]]:
        self._check_space(space)
        return self.read_coordinates()

    def get_histology_image_path(
        self, space: Optional[str] = None
    ) -> tuple[Optional[Path], Optional[str]]:
        self._check_space(space)
        return None, None

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

    def get_spots(
        self, predictions_file: Path, space: Optional[str] = None
    ) -> list:
        pred = self.read_predictions(predictions_file)
        coords = self.read_display_coordinates(space)

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