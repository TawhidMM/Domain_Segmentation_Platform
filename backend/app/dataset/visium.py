import csv
import json
from functools import cached_property
from pathlib import Path
from typing import Set, List, Optional

import h5py
from PIL import Image

from app.dataset.spatial_dataset import SpatialDataReader
from app.exceptions.dataset_validation_exception import DatasetValidationError


class VisiumDataReader(SpatialDataReader):
    SPATIAL_DIR = "spatial"
    SCALE_FACTORS_FILE = "scalefactors_json.json"
    POSITIONS_FILES = ("tissue_positions.csv", "tissue_positions_list.csv")
    IMAGE_FILES = ("tissue_hires_image.png", "tissue_lowres_image.png")
    MATRIX_FILES = ("filtered_feature_bc_matrix.h5", "raw_feature_bc_matrix.h5")

    display_spaces = ("fullres", "hires", "lowres")
    default_display_space = "hires"

    def __init__(self, dataset_dir: Path):
        super().__init__(dataset_dir)

    def _find_spatial_dir(self) -> Optional[Path]:
        spatial_dir = self.dataset_dir / self.SPATIAL_DIR
        if spatial_dir.exists():
            return spatial_dir
        possible_paths = list(self.dataset_dir.rglob(self.SPATIAL_DIR))
        return possible_paths[0] if possible_paths else None

    @cached_property
    def _spatial_dir(self) -> Path:
        spatial_dir = self._find_spatial_dir()
        if spatial_dir is None:
            raise FileNotFoundError("No spatial result_directory found")
        return spatial_dir

    @cached_property
    def _coordinates_file(self) -> Path:
        for name in self.POSITIONS_FILES:
            candidate = self._spatial_dir / name
            if candidate.exists():
                return candidate
        raise FileNotFoundError("No tissue positions file found in spatial result_directory")

    @cached_property
    def _scale_factors(self) -> dict:
        scale_file = self._spatial_dir / self.SCALE_FACTORS_FILE
        if not scale_file.exists():
            raise FileNotFoundError(
                f"Scale factors file not found at {scale_file}. "
                f"Expected '{self.SCALE_FACTORS_FILE}' in spatial result_directory."
            )
        with scale_file.open("r") as f:
            return json.load(f)

    def validate(self) -> None:
        self._validate_layout()
        self._validate_content()

    def _validate_layout(self) -> None:
        spatial_dir = self._find_spatial_dir()
        if spatial_dir is None:
            raise DatasetValidationError(f"Missing '{self.SPATIAL_DIR}' directory in extracted dataset.")

        if not any((spatial_dir / name).exists() for name in self.POSITIONS_FILES):
            raise DatasetValidationError(
                f"Missing tissue positions file in {self.SPATIAL_DIR}/ "
                f"(expected {' or '.join(self.POSITIONS_FILES)})."
            )

        if not (spatial_dir / self.SCALE_FACTORS_FILE).exists():
            raise DatasetValidationError(f"Missing {self.SCALE_FACTORS_FILE} in {self.SPATIAL_DIR}/.")

        for name in self.IMAGE_FILES:
            if not (spatial_dir / name).exists():
                raise DatasetValidationError(
                    f"Missing {name} in {self.SPATIAL_DIR}/. Both hires and lowres "
                    f"images are required."
                )

        if not any((self.dataset_dir / name).exists() for name in self.MATRIX_FILES):
            raise DatasetValidationError(
                f"Missing feature matrix (expected {' or '.join(self.MATRIX_FILES)})."
            )

    def _validate_content(self) -> None:
        spatial_dir = self._find_spatial_dir()
        if spatial_dir is None:
            return

        self._validate_scalefactors(spatial_dir)
        self._validate_positions(spatial_dir)
        self._validate_matrix_structure()
        self._validate_images(spatial_dir)
        self._validate_barcode_alignment(spatial_dir)

    def _validate_scalefactors(self, spatial_dir: Path) -> None:
        scale_file = spatial_dir / self.SCALE_FACTORS_FILE
        try:
            with scale_file.open("r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            raise DatasetValidationError(f"{self.SCALE_FACTORS_FILE} is not valid JSON: {exc}")

        required_keys = {
            "tissue_hires_scalef",
            "tissue_lowres_scalef",
            "spot_diameter_fullres",
            "fiducial_diameter_fullres",
        }
        missing = required_keys - set(data.keys())
        if missing:
            raise DatasetValidationError(
                f"{self.SCALE_FACTORS_FILE} missing keys: {', '.join(sorted(missing))}"
            )

    def _validate_positions(self, spatial_dir: Path):

        positions_file = self._find_positions_file(spatial_dir)
        if positions_file is None:
            raise DatasetValidationError("tissue_positions file is missing from spatial directory.")

        valid_barcodes: Set[str] = set()
        error_samples: List[str] = []
        total_rows = 0
        in_tissue_count = 0

        try:
            with positions_file.open(newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                first_row = next(reader, None)

                if first_row is None:
                    raise DatasetValidationError(f"File '{positions_file.name}' is empty.")

                # Dynamic header check (Space Ranger v2+ has 'barcode' header; v1 has data)
                has_header = first_row[0].strip().lower() == "barcode"

                if not has_header:
                    # Treat first row as data
                    self._validate_single_row(
                        first_row, 1, valid_barcodes, error_samples
                    )
                    total_rows += 1
                    if len(first_row) >= 2 and first_row[1].strip() == "1":
                        in_tissue_count += 1

                for line_idx, row in enumerate(reader, start=2 if has_header else 2):
                    if not row:  # Ignore trailing blank lines
                        continue

                    total_rows += 1
                    is_in_tissue = self._validate_single_row(
                        row, line_idx, valid_barcodes, error_samples
                    )
                    if is_in_tissue:
                        in_tissue_count += 1

                    # Stop collecting errors if we hit too many to keep memory/logging light
                    if len(error_samples) >= 5:
                        break

        except (csv.Error, OSError) as exc:
            raise DatasetValidationError(f"File '{positions_file.name}' is not readable CSV: {exc}")

        # Batch reporting for malformed rows
        if error_samples:
            formatted_errors = "; ".join(error_samples)
            raise DatasetValidationError(
                f"tissue_positions file contains malformed data rows: {formatted_errors}"
            )

        if in_tissue_count == 0:
            raise DatasetValidationError(
                "tissue_positions file has 0 spots flagged as in_tissue (in_tissue = 1). "
                "Dataset contains no biological tissue data."
            )

    def _validate_single_row(
            self,
            row: List[str],
            line_num: int,
            valid_barcodes: Set[str],
            error_samples: List[str],
    ) -> bool:

        EXPECTED_COLUMNS = 6

        if len(row) != EXPECTED_COLUMNS:
            error_samples.append(
                f"Line {line_num}: expected {EXPECTED_COLUMNS} columns, got {len(row)}"
            )
            return False

        barcode = row[0].strip().strip('"')
        if not barcode:
            error_samples.append(f"Line {line_num}: empty barcode")
            return False

        try:
            in_tissue = int(row[1].strip())
        except ValueError:
            error_samples.append(f"Line {line_num}: invalid in_tissue value '{row[1]}'")
            return False

        try:
            float(row[2].strip())
            float(row[3].strip())
            float(row[4].strip())
            float(row[5].strip())
        except ValueError:
            error_samples.append(f"Line {line_num}: non-numeric coordinate value")
            return False

        if in_tissue not in (0, 1):
            error_samples.append(f"Line {line_num}: in_tissue must be 0 or 1")
            return False

        if in_tissue == 1:
            valid_barcodes.add(barcode)

        return True

    def _validate_matrix_structure(self) -> None:
        matrix_file = self._find_matrix_file()
        if matrix_file is None:
            raise DatasetValidationError(
                f"Missing feature matrix (expected {' or '.join(self.MATRIX_FILES)})."
            )

        try:
            with h5py.File(matrix_file, "r") as h5f:
                barcodes_dset = h5f.get("matrix/barcodes")
                if barcodes_dset is None:
                    raise DatasetValidationError(
                        "Matrix file does not contain 'matrix/barcodes' dataset."
                    )
                matrix_barcodes = [
                    (b.decode("utf-8") if isinstance(b, bytes) else str(b)).strip()
                    for b in barcodes_dset[:]
                ]
        except (OSError, ValueError, KeyError) as exc:
            raise DatasetValidationError(f"File is not a valid HDF5 matrix: {exc}")

        if len(matrix_barcodes) == 0:
            raise DatasetValidationError("Matrix file contains no barcodes.")

    def _validate_images(self, spatial_dir: Path) -> None:
        for name in self.IMAGE_FILES:
            image_file = spatial_dir / name
            if not image_file.exists():
                raise DatasetValidationError(f"Missing {name} in {self.SPATIAL_DIR}/.")
            try:
                with Image.open(image_file) as img:
                    img.verify()
            except (OSError, ValueError) as exc:
                raise DatasetValidationError(
                    f"Image {name} is corrupted or not a valid image: {exc}"
                )

    def _validate_barcode_alignment(self, spatial_dir: Path) -> None:
        positions_file = self._find_positions_file(spatial_dir)
        matrix_file = self._find_matrix_file()
        if positions_file is None or matrix_file is None:
            return

        position_barcodes: set[str] = set()
        try:
            with positions_file.open(newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                first_row = next(reader, None)
                if first_row and first_row[0].strip().lower() != "barcode":
                    position_barcodes.add(first_row[0].strip().strip('"'))

                for row in reader:
                    if row and row[0].strip():
                        position_barcodes.add(row[0].strip().strip('"'))
        except (csv.Error, OSError) as exc:
            raise DatasetValidationError(f"Failed to read tissue_positions for alignment check: {exc}")

        matrix_barcodes: list[str] = []
        try:
            with h5py.File(matrix_file, "r") as h5f:
                barcodes_dset = h5f.get("matrix/barcodes")
                if barcodes_dset is None:
                    return
                matrix_barcodes = [
                    (b.decode("utf-8") if isinstance(b, bytes) else str(b)).strip().strip('"')
                    for b in barcodes_dset[:]
                ]
        except (OSError, ValueError, KeyError) as exc:
            raise DatasetValidationError(f"File is not a valid HDF5 matrix: {exc}")

        if not matrix_barcodes:
            return

        missing = [bc for bc in matrix_barcodes if bc not in position_barcodes]
        if missing:
            raise DatasetValidationError(
                "Matrix contains barcodes not found in tissue_positions file. "
                f"Missing count: {len(missing)}."
            )

    def _find_matrix_file(self) -> Optional[Path]:
        for name in self.MATRIX_FILES:
            candidate = self.dataset_dir / name
            if candidate.exists():
                return candidate
        return None

    def _find_positions_file(self, spatial_dir: Path) -> Optional[Path]:
        for name in self.POSITIONS_FILES:
            candidate = spatial_dir / name
            if candidate.exists():
                return candidate
        return None

    def read_coordinates(self) -> dict[str, tuple[float, float]]:
        coord_map = {}
        with self._coordinates_file.open(newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) < 6:
                    continue
                if str(row[1]).strip() == "0":
                    continue
                barcode = row[0].strip()
                pxl_col = float(row[5])
                pxl_row = float(row[4])
                coord_map[barcode] = (pxl_col, pxl_row)
        return coord_map

    def read_display_coordinates(
        self, space: Optional[str] = None
    ) -> dict[str, tuple[float, float]]:

        space = self._check_space(space)
        raw = self.read_coordinates()

        if space == "fullres":
            return raw

        scale_factor = float(self._scale_factors[f"tissue_{space}_scalef"])

        return {
            barcode: (x * scale_factor, y * scale_factor)
            for barcode, (x, y) in raw.items()
        }

    def get_histology_image_path(
        self, space: Optional[str] = None
    ) -> tuple[Optional[Path], Optional[str]]:

        space = self._check_space(space)

        if space == "fullres":
            # Full-resolution histology image (common Space Ranger v2 outputs)
            for name in ("tissue_fullres_image.tif", "tissue_full_image.tif"):
                image_file = self._spatial_dir / name
                if image_file.exists():
                    return image_file, "fullres"
            return None, None

        name = f"tissue_{space}_image.png"
        image_file = self._spatial_dir / name

        if image_file.exists():
            return image_file, name.replace("tissue_", "").replace("_image.png", "")

        return None, None
