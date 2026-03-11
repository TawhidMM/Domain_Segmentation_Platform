import json
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List

import matplotlib.pyplot as plt
import numpy as np

from app.visualization.svg_utils import embed_svg_metadata, save_svg_to_string


def _embed_metadata(svg_string: str, metadata: Dict[str, object]) -> str:
    return embed_svg_metadata(svg_string, metadata)


def generate_metric_svg(
    metric_key: str,
    metric_label: str,
    values: List[float],
    labels: List[str],
    colors: List[str],
    experiment_ids: List[str],
    generated_at: str,
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

    svg_string = save_svg_to_string(fig)
    plt.close(fig)

    metadata = {
        "plot_type": "metric_comparison",
        "metric": metric_key,
        "experiment_ids": experiment_ids,
        "generated_at": generated_at
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
