import json
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List
import xml.etree.ElementTree as ET

import matplotlib.pyplot as plt
from matplotlib.backends.backend_svg import FigureCanvasSVG
import numpy as np


def _embed_metadata(svg_string: str, metadata: Dict[str, object]) -> str:
    metadata_json = json.dumps(metadata, ensure_ascii=True)

    root = ET.fromstring(svg_string)
    ns = {"svg": "http://www.w3.org/2000/svg"}
    ET.register_namespace("", ns["svg"])

    metadata_elem = root.find("svg:metadata", ns)
    if metadata_elem is None:
        metadata_elem = ET.Element("{http://www.w3.org/2000/svg}metadata")
        root.insert(0, metadata_elem)

    metadata_elem.clear()
    metadata_text = ET.SubElement(metadata_elem, "data")
    metadata_text.text = metadata_json

    return ET.tostring(root, encoding="unicode", method="xml")


def generate_metric_svg(
    metric_key: str,
    metric_label: str,
    values: List[float],
    labels: List[str],
    colors: List[str],
    experiment_ids: List[str],
    generated_at: str,
    backend_version: str,
    note: str
) -> str:
    fig, ax = plt.subplots(figsize=(6, 4), dpi=300, facecolor="white")

    x = np.arange(len(values))
    ax.bar(x, values, color=colors, edgecolor="none")

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel(metric_label, fontsize=11)
    ax.set_title(f"{metric_label} ({note})", fontsize=12, fontweight="bold")

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.grid(False)

    fig.tight_layout()

    buffer = BytesIO()
    canvas = FigureCanvasSVG(fig)
    canvas.print_svg(buffer)
    buffer.seek(0)

    svg_string = buffer.read().decode("utf-8")
    plt.close(fig)

    metadata = {
        "plot_type": "metric_comparison",
        "metric": metric_key,
        "experiment_ids": experiment_ids,
        "generated_at": generated_at,
        "backend_version": backend_version
    }

    return _embed_metadata(svg_string, metadata)


def create_metrics_zip_export(svg_map: Dict[str, str], csv_content: str) -> bytes:
    import zipfile

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for filename, svg_content in svg_map.items():
            zip_file.writestr(filename, svg_content)

        zip_file.writestr("metrics_table.csv", csv_content)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
