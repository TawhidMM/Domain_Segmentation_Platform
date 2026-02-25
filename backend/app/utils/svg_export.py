import json
from io import BytesIO
from datetime import datetime
from typing import Optional, Dict, Any
import xml.etree.ElementTree as ET

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.backends.backend_svg import FigureCanvasSVG
import numpy as np
import umap


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
        job_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        dataset_id: str,
        created_at: datetime,
        backend_version: str = "1.0.0"
    ):

        self.job_id = job_id
        self.tool_name = tool_name
        self.parameters = parameters
        self.dataset_id = dataset_id
        self.created_at = created_at
        self.backend_version = backend_version
        self.exported_at = datetime.utcnow().isoformat() + "Z"

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

        # Create figure with scientific styling
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

        # Render to SVG buffer
        buffer = BytesIO()
        canvas = FigureCanvasSVG(fig)
        canvas.print_svg(buffer)
        buffer.seek(0)

        svg_string = buffer.read().decode("utf-8")
        plt.close(fig)

        # Embed metadata if requested
        if include_metadata:
            svg_string = self._embed_metadata(svg_string)

        return svg_string

    def _embed_metadata(self, svg_string: str) -> str:

        metadata = {
            "job_id": self.job_id,
            "tool": self.tool_name,
            "parameters": self.parameters,
            "created_at": self.created_at.isoformat(),
            "exported_at": self.exported_at,
            "dataset": self.dataset_id,
            "backend_version": self.backend_version,
            "export_format": "svg"
        }

        metadata_json = json.dumps(metadata, ensure_ascii=False)

        # Parse SVG and inject metadata
        root = ET.fromstring(svg_string)

        # Create or find metadata element
        ns = {"svg": "http://www.w3.org/2000/svg"}
        ET.register_namespace("", ns["svg"])

        # Find or create metadata tag
        metadata_elem = root.find("svg:metadata", ns)
        if metadata_elem is None:
            metadata_elem = ET.Element("{http://www.w3.org/2000/svg}metadata")
            root.insert(0, metadata_elem)

        # Clear existing metadata
        metadata_elem.clear()

        # Add JSON as CDATA or text content
        metadata_text = ET.SubElement(metadata_elem, "data")
        metadata_text.text = metadata_json

        # Convert back to string
        return ET.tostring(root, encoding="unicode", method="xml")

    def generate_metadata_json(self) -> Dict[str, Any]:

        return {
            "job_id": self.job_id,
            "tool": self.tool_name,
            "parameters": self.parameters,
            "created_at": self.created_at.isoformat(),
            "exported_at": self.exported_at,
            "dataset": self.dataset_id,
            "backend_version": self.backend_version,
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

