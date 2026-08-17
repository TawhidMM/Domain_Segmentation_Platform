from datetime import datetime, timezone
from typing import Any, Dict, Tuple
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import numpy as np
import umap

from app.visualization.svg_utils import embed_svg_metadata, save_svg_to_string, save_as_pdf

# Module-level matplotlib defaults
matplotlib.use('Agg')
plt.rcParams['svg.fonttype'] = 'none'

# Shared style constants
FIGURE_SIZE_INCHES = (90 / 25.4, 90 / 25.4)
DPI = 300
RASTER_DPI = 1200
FONT_SIZE = 7
FONT_FAMILY = "sans-serif"
BACKGROUND_COLOR = "white"

# sizes for a 90mm canvas
SPATIAL_SPOT_SIZE = 4.0
UMAP_SPOT_SIZE = 4.0
LEGEND_MARKER_SIZE = 4.0


def _sort_key(domain_id):
    try:
        return 0, int(domain_id)
    except (ValueError, TypeError):
        return 1, str(domain_id)


def _shuffle_spots(spots, seed=42):
    spots = list(spots)
    rng = np.random.RandomState(seed)
    rng.shuffle(spots)
    return spots


def _build_legend_handles(domain_colors):

    return [
        Line2D(
            [0], [0],
            marker='o',
            color='w',
            markerfacecolor=color,
            markersize=LEGEND_MARKER_SIZE,
            label=str(domain_id),
            linestyle='none'
        )
        for domain_id, color in sorted(domain_colors.items(), key=_sort_key)
    ]


def _style_axes(
    ax,
    legend_handles,
    font_size,
    font_family,
    include_title,
    title_text,
    invert_y=False
):

    ax.set_aspect("equal", adjustable="box")
    if invert_y:
        ax.invert_yaxis()

    if include_title:
        ax.set_title(
            title_text,
            fontsize=font_size + 1,
            fontfamily=font_family,
            fontweight="bold"
        )

    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
    ax.grid(False)

    for spine in ax.spines.values():
        spine.set_visible(False)

    if legend_handles:
        ax.legend(
            handles=legend_handles,
            title="Domain",
            loc="center left",
            bbox_to_anchor=(1.02, 0.5),
            frameon=False,
            fontsize=font_size - 1,
            title_fontsize=font_size,
        )


def _save_and_close(fig):

    svg_string = save_svg_to_string(fig, dpi=RASTER_DPI)
    pdf_bytes = save_as_pdf(fig, dpi=RASTER_DPI)
    plt.close(fig)
    return svg_string, pdf_bytes


def _build_metadata(run_id, tool_name, parameters, exported_at, extra=None):
    """Build shared metadata dict."""
    metadata: Dict[str, Any] = {
        "run_id": run_id,
        "tool": tool_name,
        "parameters": parameters,
        "exported_at": exported_at.isoformat() if hasattr(exported_at, "isoformat") else exported_at,
        "export_format": "svg"
    }
    if extra:
        metadata.update(extra)
    return metadata


def export_spatial_plot_svg(
    run_id: str,
    tool_name: str,
    parameters: Dict[str, Any],
    dataset_id: str,
    spots: list,
    domains: list,
    include_metadata: bool = True,
    include_title: bool = False
) -> Tuple[str, bytes, Dict[str, Any]]:
    """
    Generate SVG + PDF bytes for a spatial transcriptomics scatter plot.

    Returns:
        (svg_string, PDF_bytes, metadata_dict)
    """
    domain_colors = {d["domain_id"]: d["color"] for d in domains}

    shuffled_spots = _shuffle_spots(spots, seed=42)

    xs = np.array([s["x"] for s in shuffled_spots])
    ys = np.array([s["y"] for s in shuffled_spots])
    colors = [domain_colors.get(s["domain"], "#808080") for s in shuffled_spots]

    fig, ax = plt.subplots(
        figsize=FIGURE_SIZE_INCHES,
        dpi=DPI,
        facecolor=BACKGROUND_COLOR
    )

    # Rasterize only the point cloud; text/legend remain vector
    sc = ax.scatter(
        xs, ys,
        s=SPATIAL_SPOT_SIZE,
        c=colors,
        alpha=0.8,
        edgecolors="none",
    )
    sc.set_rasterized(True)

    legend_handles = _build_legend_handles(domain_colors)
    _style_axes(
        ax, legend_handles, FONT_SIZE, FONT_FAMILY, include_title,
        title_text=f"Spatial Analysis: {tool_name}",
        invert_y=True
    )

    fig.tight_layout(rect=[0, 0, 0.82, 1])

    svg_string, pdf_bytes = _save_and_close(fig)

    exported_at = datetime.now(timezone.utc)
    metadata = _build_metadata(
        run_id, tool_name, parameters, exported_at,
        extra={"dataset": dataset_id, "plot_type": "spatial"}
    )

    if include_metadata:
        svg_string = embed_svg_metadata(svg_string, metadata)

    return svg_string, pdf_bytes, metadata


def export_umap_svg(
    run_id: str,
    tool_name: str,
    parameters: Dict[str, Any],
    embeddings,
    domains,
    colors,
    include_metadata: bool = True,
    include_title: bool = False
) -> Tuple[str, bytes, Dict[str, Any]]:
    """
    Generate SVG + PDF bytes for a UMAP embedding plot.

    Returns:
        (svg_string, PDF_bytes, metadata_dict)
    """
    reducer = umap.UMAP(
        n_neighbors=15,
        min_dist=0.1,
        random_state=42,
        verbose=False
    )
    umap_coords = reducer.fit_transform(embeddings)

    domains = np.asarray(domains)
    colors = np.asarray(colors)

    # Build a dict so we can reuse the shared legend builder
    domain_colors = {}
    for domain_id, color in zip(domains, colors):
        if domain_id not in domain_colors:
            domain_colors[domain_id] = color

    legend_handles = _build_legend_handles(domain_colors)

    # Fixed-seed shuffle for draw order
    rng = np.random.RandomState(42)
    indices = np.arange(len(umap_coords))
    rng.shuffle(indices)
    umap_coords = umap_coords[indices]
    shuffled_colors = colors[indices]

    fig, ax = plt.subplots(
        figsize=FIGURE_SIZE_INCHES,
        dpi=DPI,
        facecolor=BACKGROUND_COLOR
    )

    # Rasterize only the point cloud; text/legend remain vector
    sc = ax.scatter(
        umap_coords[:, 0],
        umap_coords[:, 1],
        s=UMAP_SPOT_SIZE,
        c=shuffled_colors,
        alpha=1.0,
        edgecolors="none",
    )
    sc.set_rasterized(True)

    _style_axes(
        ax, legend_handles, FONT_SIZE, FONT_FAMILY, include_title,
        title_text=f"UMAP: {tool_name}",
        invert_y=False
    )

    fig.tight_layout(rect=[0, 0, 0.82, 1])

    svg_string, pdf_bytes = _save_and_close(fig)

    exported_at = datetime.now(timezone.utc).isoformat()
    metadata = _build_metadata(
        run_id, tool_name, parameters, exported_at,
        extra={
            "plot_type": "umap",
            "generated_from": "embeddings.csv",
            "umap_parameters": {
                "n_neighbors": 15,
                "min_dist": 0.1,
                "random_state": 42
            }
        }
    )

    if include_metadata:
        svg_string = embed_svg_metadata(svg_string, metadata)

    return svg_string, pdf_bytes, metadata


def create_zip_export(
    svg_content: str,
    pdf_bytes: bytes,
    filename: str
) -> bytes:
    """Package SVG, optional PDF, and metadata JSON into a ZIP archive."""
    import zipfile
    from io import BytesIO

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        svg_filename = f"{filename}.svg"
        zip_file.writestr(svg_filename, svg_content)

        pdf_filename = f"{filename}.pdf"
        zip_file.writestr(pdf_filename, pdf_bytes)


    zip_buffer.seek(0)
    return zip_buffer.getvalue()