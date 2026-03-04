import colorsys
import csv
import json
from pathlib import Path

REQUIRED = [
    "filtered_feature_bc_matrix",
    "spatial"
]


def validate_visium_input(input_dir: Path):
    for name in REQUIRED:
        if not (input_dir / name).exists():
            raise ValueError(
                f"Invalid Visium input: missing '{name}'. "
                "Please upload a standard Space Ranger output directory."
            )


def read_scale_factors(spatial_dir: Path) -> dict:
    scale_file = spatial_dir / "scalefactors_json.json"

    if not scale_file.exists():
        raise FileNotFoundError(
            f"Scale factors file not found at {scale_file}. "
            "Expected 'scalefactors_json.json' in spatial directory."
        )

    with open(scale_file, "r") as f:
        scale_factors = json.load(f)

    return scale_factors


def read_predictions(prediction_file:Path) -> dict:
    target_file = prediction_file

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

def read_coordinates(coord_file: Path, scale_factors: dict = None) -> dict:
    coord_map = {}

    # Default scale factor if not provided
    scale_factor = 1.0
    if scale_factors and "tissue_hires_scalef" in scale_factors:
        scale_factor = scale_factors["tissue_hires_scalef"]

    with open(coord_file, newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if row[1] == 0:
                continue
            barcode = row[0]
            pxl_col = float(row[5])  # x coordinate
            pxl_row = float(row[4])  # y coordinate

            # Scale coordinates to high resolution
            scaled_x = pxl_col * scale_factor
            scaled_y = pxl_row * scale_factor

            coord_map[barcode] = (scaled_x, scaled_y)

    return coord_map


def merge_predictions_and_coords(predictions_file: Path, coords_file: Path, scale_factors: dict = None) -> list:
    pred = read_predictions(predictions_file)
    coords = read_coordinates(coords_file, scale_factors)

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

def generate_domain_colors(spots):
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


def get_color_mapped_domain(spots:list):
    color_map = generate_domain_colors(spots)

    domains = [
        {
            "domain_id": d,
            "color": color_map[d]
        }
        for d in sorted(color_map.keys())
    ]

    return domains


def get_histology_image_path(spatial_dir: Path) -> tuple[Path | None, str | None]:

    hires_image = spatial_dir / "tissue_hires_image.png"
    lowres_image = spatial_dir / "tissue_lowres_image.png"
    
    if hires_image.exists():
        return hires_image, "hires"
    elif lowres_image.exists():
        return lowres_image, "lowres"
    
    return None, None
