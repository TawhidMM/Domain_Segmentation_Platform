import colorsys
import csv
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

def read_coordinates(coord_file:Path) -> dict:
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


def merge_predictions_and_coords(predictions_file:Path, coords_file:Path):
    pred = read_predictions(predictions_file)
    coords = read_coordinates(coords_file)

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
