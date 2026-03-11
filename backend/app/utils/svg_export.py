import json
from datetime import datetime, timezone
from typing import Dict, Any

import matplotlib.pyplot as plt
import numpy as np

from app.visualization.svg_utils import embed_svg_metadata, save_svg_to_string


class SpatialPlotExporter:
    """Handles SVG export of spatial transcriptomics data."""

    # Scientific-grade styling constants
    FIGURE_SIZE_INCHES = (8, 8)
    DPI = 300
    MARKER_SIZE = 40
    FONT_SIZE = 11
    FONT_FAMILY = "sans-serif"
    BACKGROUND_COLOR = "white"

    def __init__(
        self,
        run_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        dataset_id: str
    ):

        self.run_id = run_id
        self.tool_name = tool_name
        self.parameters = parameters
        self.dataset_id = dataset_id
        self.exported_at = datetime.now(timezone.utc)

    def generate_svg(
        self,
        spots: list,
        domains: list,
        include_metadata: bool = True
    ) -> str:

        # Create domain color mapping
        domain_colors = {d["domain_id"]: d["color"] for d in domains}

        # Sort spots deterministically for reproducibility
        sorted_spots = sorted(spots, key=lambda s: (s["x"], s["y"]))

        # Extract coordinates and colors
        xs = np.array([s["x"] for s in sorted_spots])
        ys = np.array([s["y"] for s in sorted_spots])
        colors = [domain_colors.get(s["domain"], "#808080") for s in sorted_spots]

        # Create a figure with scientific styling
        fig, ax = plt.subplots(
            figsize=self.FIGURE_SIZE_INCHES,
            dpi=self.DPI,
            facecolor=self.BACKGROUND_COLOR
        )

        # Plot spatial data
        ax.scatter(
            xs,
            ys,
            s=self.MARKER_SIZE,
            c=colors,
            alpha=0.8,
            edgecolors="none",
            rasterized=False  # Vector-only output
        )

        # Configure axes for publication quality
        ax.set_aspect("equal", adjustable="box")
        ax.invert_yaxis()
        ax.set_xlabel("X Coordinate", fontsize=self.FONT_SIZE, fontfamily=self.FONT_FAMILY)
        ax.set_ylabel("Y Coordinate", fontsize=self.FONT_SIZE, fontfamily=self.FONT_FAMILY)
        ax.set_title(
            f"Spatial Analysis: {self.tool_name}",
            fontsize=self.FONT_SIZE + 1,
            fontfamily=self.FONT_FAMILY,
            fontweight="bold"
        )

        # Clean axis styling
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.tick_params(labelsize=self.FONT_SIZE - 1)

        # Tight layout for scientific output
        fig.tight_layout()

        svg_string = save_svg_to_string(fig)
        plt.close(fig)

        # Embed metadata if requested
        if include_metadata:
            svg_string = self._embed_metadata(svg_string)

        return svg_string

    def _embed_metadata(self, svg_string: str) -> str:

        metadata = {
            "run_id": self.run_id,
            "tool": self.tool_name,
            "parameters": self.parameters,
            "exported_at": self.exported_at,
            "dataset": self.dataset_id,
            "export_format": "svg"
        }

        return embed_svg_metadata(svg_string, metadata)

    def generate_metadata_json(self) -> Dict[str, Any]:

        return {
            "run_id": self.run_id,
            "tool": self.tool_name,
            "parameters": self.parameters,
            "exported_at": self.exported_at,
            "dataset": self.dataset_id,
            "export_format": "svg"
        }


def create_zip_export(
    job_id: str,
    svg_content: str,
    metadata: Dict[str, Any]
) -> bytes:

    import zipfile
    from io import BytesIO

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # Add SVG
        svg_filename = f"experiment_{job_id}.svg"
        zip_file.writestr(svg_filename, svg_content)

        # Add metadata JSON
        metadata_filename = f"experiment_{job_id}_metadata.json"
        metadata_json = json.dumps(metadata, indent=2, ensure_ascii=False)
        zip_file.writestr(metadata_filename, metadata_json)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()

