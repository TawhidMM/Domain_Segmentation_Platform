import json
import shutil
import zipfile
from pathlib import Path
import csv
import colorsys

from app.core.config import UPLOAD_DIR, UPLOAD_ZIP_FILENAME
from app.tools.adapters.base import ToolAdapter
from app.tools.params.scribbledom import SCRIBBLEDOM_PARAMS
from app.utils.params import resolve_params


class ScribbleDomAdapter(ToolAdapter):
    PREPROCESSED_DATA_FOLDER = "processed_data"
    MATRIX_REP_OF_ST_DATA_FOLDER = "matrix_representation"
    MODEL_OUTPUT_FOLDER = "model_outputs"
    FINAL_OUTPUT_FOLDER = "final_outputs"
    DATASET = "dataset_001"
    SAMPLE = "sample_001"


    def prepare_inputs(self, dataset_id):
        zip_dir = UPLOAD_DIR / f"upload_{dataset_id}" / UPLOAD_ZIP_FILENAME
        target_dir = (self.workspace["input"] /
                      self.DATASET / self.SAMPLE)

        target_dir.mkdir(parents=True, exist_ok=True)

        self.extract_dataset(zip_dir, target_dir)
        has_scribble = self._stage_manual_scribble(target_dir)

        # if self.schema == "expert" and not has_scribble:
        #     raise RuntimeError(
        #         "schema=expert requires manual_scribble.csv, but none was provided"
        #     )

        self._normalize_h5_filename(target_dir)

    def build_config(self, user_params: dict):
        resolved_params = resolve_params(user_params, SCRIBBLEDOM_PARAMS)

        system_config = {
            "preprocessed_data_folder": self.PREPROCESSED_DATA_FOLDER,
            "matrix_represenation_of_ST_data_folder": self.MATRIX_REP_OF_ST_DATA_FOLDER,
            "model_output_folder": self.MODEL_OUTPUT_FOLDER,
            "final_output_folder": self.FINAL_OUTPUT_FOLDER,

            "space_ranger_output_directory": self.workspace["input"].name,
            "dataset": self.DATASET,
            "samples": [self.SAMPLE]
        }

        config_path = self.workspace['config'] / "config.json"
        with open(config_path, "w") as f:
            json.dump({**resolved_params, **system_config}, f, indent=4)


    def _stage_manual_scribble(self, target_dir: Path):
        staged_dir = self.workspace["root"] / "staged_inputs"
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

    def extract_dataset(self, zip_path: Path, target_dir: Path):
        temp_extract_path = target_dir / f"tmp"

        try:
            if temp_extract_path.exists():
                shutil.rmtree(temp_extract_path)

            temp_extract_path.mkdir(parents=True, exist_ok=True)

            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(temp_extract_path)

            items = [i for i in temp_extract_path.iterdir()]
            if len(items) == 1 and items[0].is_dir():
                content_root = items[0]
            else:
                content_root = temp_extract_path

            for item in content_root.iterdir():
                shutil.move(str(item), str(target_dir / item.name))

        finally:
            shutil.rmtree(temp_extract_path)



    def _read_predictions(self) -> dict:
        base_dir = (
                self.workspace["output"]
                / "final_outputs"
                / self.DATASET
                / self.SAMPLE
        )

        csv_files = list(base_dir.rglob("final_barcode_labels.csv"))
        if not csv_files:
            raise FileNotFoundError("No prediction CSV found in ScribbleDom output")

        target_file = csv_files[0]

        pred_map = {}

        with open(target_file, newline="") as f:
            reader = csv.reader(f)
            next(reader)

            for row in reader:
                if len(row) < 2:
                    continue

                barcode = row[0].strip()
                domain = int(row[1])

                pred_map[barcode] = domain

        return pred_map

    def _read_coordinates(self) -> dict:
        spatial_dir = (
                self.workspace["input"]
                / self.DATASET
                / self.SAMPLE
                / "spatial"
        )

        coord_file = spatial_dir / "tissue_positions_list.csv"
        if not coord_file.exists():
            raise FileNotFoundError("tissue_positions_list.csv not found")

        coord_map = {}

        with open(coord_file, newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                if row[1] == 0:
                    continue
                barcode = row[0]
                x = float(row[5])
                y = float(row[4])
                coord_map[barcode] = (x, y)

        return coord_map

    def _merge_predictions_and_coords(self):
        pred = self._read_predictions()
        coords = self._read_coordinates()

        spots = []

        for barcode, domain in pred.items():
            if barcode not in coords:
                continue

            x, y = coords[barcode]
            spots.append({
                "barcode": barcode,
                "x": x,
                "y": y,
                "domain": domain
            })

        return spots

    def _generate_domain_colors(self, spots):
        domain_ids = sorted({s["domain"] for s in spots})
        n = len(domain_ids)

        color_map = {}

        for i, d in enumerate(domain_ids):
            hue = i / max(1, n)
            r, g, b = colorsys.hsv_to_rgb(hue, 0.65, 0.95)
            color_map[d] = "#{:02X}{:02X}{:02X}".format(
                int(r * 255),
                int(g * 255),
                int(b * 255)
            )

        return color_map

    def build_frontend_output(self, job_id: str) -> dict:
        spots = self._merge_predictions_and_coords()
        color_map = self._generate_domain_colors(spots)

        domains = [
            {
                "id": d,
                "color": color_map[d]
            }
            for d in sorted(color_map.keys())
        ]

        return {
            "jobId": job_id,
            "spots": spots,
            "domains": domains
        }