"""
UMAP visualization export for spatial transcriptomics embeddings.

Generates publication-quality SVG plots with deterministic parameters.
"""

from datetime import datetime, timezone
from typing import Dict, Any

import matplotlib.pyplot as plt
import numpy as np
import umap

from app.visualization.svg_utils import embed_svg_metadata, save_svg_to_string


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
        run_id: str,
        tool_name: str,
        parameters: Dict[str, Any]
    ):
        """
        Initialize UMAP exporter with metadata.

        Args:
            run_id: Run identifier
            tool_name: Analysis tool name
            parameters: Tool parameters used
        """
        self.run_id = run_id
        self.tool_name = tool_name
        self.parameters = parameters
        self.exported_at = datetime.now(timezone.utc).isoformat()
        self.backend_version = "unknown"

    def generate_umap_svg(
        self,
        embeddings,
        domains,
        colors,
        include_metadata: bool = True
    ) -> str:

        # Compute UMAP with deterministic parameters
        reducer = umap.UMAP(
            n_neighbors=self.UMAP_N_NEIGHBORS,
            min_dist=self.UMAP_MIN_DIST,
            random_state=self.UMAP_RANDOM_STATE,
            verbose=False
        )
        umap_coords = reducer.fit_transform(embeddings)


        # Sort by domain for deterministic layering
        sort_idx = np.argsort(domains)
        umap_coords = umap_coords[sort_idx]
        colors = colors[sort_idx]

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

        svg_string = save_svg_to_string(fig)
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
            "run_id": self.run_id,
            "plot_type": "umap",
            "tool": self.tool_name,
            "parameters": self.parameters,
            "umap_parameters": {
                "n_neighbors": self.UMAP_N_NEIGHBORS,
                "min_dist": self.UMAP_MIN_DIST,
                "random_state": self.UMAP_RANDOM_STATE
            },
            "generated_from": "embeddings.csv",
            "exported_at": self.exported_at,
            "backend_version": self.backend_version
        }

        return embed_svg_metadata(svg_string, metadata)



