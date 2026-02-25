"""
UMAP visualization export for spatial transcriptomics embeddings.

Generates publication-quality SVG plots with deterministic parameters.
"""

import json
from io import BytesIO
from datetime import datetime, timezone
from typing import Dict, Any
import xml.etree.ElementTree as ET

import matplotlib.pyplot as plt
from matplotlib.backends.backend_svg import FigureCanvasSVG
import numpy as np
import umap


class UmapPlotExporter:
    """Generates deterministic UMAP visualizations as SVG."""

    # Scientific-grade styling constants
    FIGURE_SIZE_INCHES = (6, 6)
    DPI = 300
    MARKER_SIZE = 30
    FONT_SIZE = 11
    FONT_FAMILY = "sans-serif"
    BACKGROUND_COLOR = "white"

    # UMAP deterministic parameters
    UMAP_N_NEIGHBORS = 15
    UMAP_MIN_DIST = 0.1
    UMAP_RANDOM_STATE = 42

    def __init__(
        self,
        job_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        dataset_id: str,
        created_at: datetime,
        backend_version: str = "1.0.0"
    ):
        """
        Initialize UMAP exporter with metadata.

        Args:
            job_id: Experiment identifier
            tool_name: Analysis tool name
            parameters: Tool parameters used
            dataset_id: Dataset identifier
            created_at: Experiment creation timestamp
            backend_version: API backend version
        """
        self.job_id = job_id
        self.tool_name = tool_name
        self.parameters = parameters
        self.dataset_id = dataset_id
        self.created_at = created_at
        self.backend_version = backend_version
        self.exported_at = datetime.now(timezone.utc).isoformat()

    def generate_umap_svg(
        self,
        embeddings: np.ndarray,
        barcodes: np.ndarray,
        domains: Dict[str, Dict[str, str]],
        include_metadata: bool = True
    ) -> str:
        """
        Generate UMAP visualization as SVG.

        Args:
            embeddings: Shape (n_spots, n_dims) embedding matrix
            barcodes: Shape (n_spots,) barcode identifiers
            domains: Dict mapping barcode → {domain_id, color}
            include_metadata: Whether to embed metadata in SVG

        Returns:
            SVG string with optional embedded metadata
        """
        # Compute UMAP with deterministic parameters
        reducer = umap.UMAP(
            n_neighbors=self.UMAP_N_NEIGHBORS,
            min_dist=self.UMAP_MIN_DIST,
            random_state=self.UMAP_RANDOM_STATE,
            verbose=False
        )
        umap_coords = reducer.fit_transform(embeddings)

        # Extract domain information and sort deterministically
        domain_ids = np.array([domains[bc].get("domain_id", "unknown") for bc in barcodes])
        colors = np.array([domains[bc].get("color", "#808080") for bc in barcodes])

        # Sort by domain for deterministic layering
        sort_idx = np.argsort(domain_ids)
        umap_coords = umap_coords[sort_idx]
        colors = colors[sort_idx]
        domain_ids = domain_ids[sort_idx]

        # Create figure with scientific styling
        fig, ax = plt.subplots(
            figsize=self.FIGURE_SIZE_INCHES,
            dpi=self.DPI,
            facecolor=self.BACKGROUND_COLOR
        )

        # Plot UMAP
        ax.scatter(
            umap_coords[:, 0],
            umap_coords[:, 1],
            s=self.MARKER_SIZE,
            c=colors,
            alpha=1.0,
            edgecolors="none",
            rasterized=False  # Vector-only
        )

        # Configure axes for publication quality
        ax.set_aspect("equal", adjustable="box")
        ax.set_xlabel("UMAP 1", fontsize=self.FONT_SIZE, fontfamily=self.FONT_FAMILY)
        ax.set_ylabel("UMAP 2", fontsize=self.FONT_SIZE, fontfamily=self.FONT_FAMILY)
        ax.set_title(
            f"UMAP: {self.tool_name}",
            fontsize=self.FONT_SIZE + 1,
            fontfamily=self.FONT_FAMILY,
            fontweight="bold"
        )

        # Clean axis styling (minimal ticks)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.tick_params(labelsize=self.FONT_SIZE - 1)
        ax.grid(False)

        # Tight layout
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
        """
        Embed JSON metadata inside SVG <metadata> tag.

        Args:
            svg_string: Original SVG XML string

        Returns:
            SVG with embedded metadata
        """
        metadata = {
            "job_id": self.job_id,
            "plot_type": "umap",
            "tool": self.tool_name,
            "parameters": self.parameters,
            "umap_parameters": {
                "n_neighbors": self.UMAP_N_NEIGHBORS,
                "min_dist": self.UMAP_MIN_DIST,
                "random_state": self.UMAP_RANDOM_STATE
            },
            "generated_from": "embeddings.csv",
            "created_at": self.created_at.isoformat(),
            "exported_at": self.exported_at,
            "backend_version": self.backend_version
        }

        metadata_json = json.dumps(metadata, ensure_ascii=False)

        # Parse SVG and inject metadata
        root = ET.fromstring(svg_string)

        # Create or find metadata element
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



