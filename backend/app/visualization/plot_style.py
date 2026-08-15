"""Shared publication-grade styling for manuscript figures.

Centralizes typography, color, layout sizing, and axes styling so every
figure produced by the backend is visually consistent (same palette, fonts,
margins, spine/grid treatment). Plotting functions should import from here
instead of redefining style settings per call.
"""
from typing import Dict, List, Tuple

import glasbey
import matplotlib
from matplotlib.axes import Axes

# ── Typography ────────────────────────────────────────────────────────────────

FONT_FAMILY = "sans-serif"
FONT_SANS_SERIF = ["Arial", "Helvetica", "DejaVu Sans"]

FONT_SIZE_AXIS_LABEL = 10
FONT_SIZE_TICK_LABEL = 9
FONT_SIZE_ANNOTATION = 8

# ── Layout ────────────────────────────────────────────────────────────────────

SINGLE_COLUMN_WIDTH_INCHES = 3.5
DOUBLE_COLUMN_WIDTH_INCHES = 7.0

MIN_ASPECT_RATIO = 1.2   # width:height
MAX_ASPECT_RATIO = 1.6

MIN_HEIGHT_INCHES = 3.0
MAX_HEIGHT_INCHES = 4.8

FIGURE_HEIGHT_INCHES = 4.8
MIN_WIDTH_PER_GROUP_INCHES = 1.2
FIXED_WIDTH_PAD_INCHES = 1.5
Y_HEADROOM = 0.06  # ~6% headroom above/below the data on the y-axis

# Above this many characters, x tick labels are rotated instead of kept flat.
MAX_X_LABEL_LENGTH_FLAT = 12

# ── Color ─────────────────────────────────────────────────────────────────────

POINT_COLOR = "#111827"  # neutral dark: raw-data points
MARKER_COLOR = "#111827"  # neutral dark: mean/median markers on top
GRID_COLOR = "#D1D5DB"  # light gray gridlines
GRID_ALPHA = 0.6

BOX_FILL_ALPHA = 0.85
POINT_ALPHA = 0.5
POINT_SIZE = 2.5

# ── Shared configuration ──────────────────────────────────────────────────────

_configured = False


def configure_publication_style() -> None:
    """Apply the manuscript-wide style defaults once; safe to call repeatedly."""
    global _configured
    if _configured:
        return

    # SVG must keep live/editable text (fonts-as-text, not outlined paths).
    matplotlib.rcParams["svg.fonttype"] = "none"

    # Sans-serif everywhere: Arial / Helvetica, DejaVu Sans as fallback.
    matplotlib.rcParams["font.family"] = FONT_FAMILY
    matplotlib.rcParams["font.sans-serif"] = FONT_SANS_SERIF

    matplotlib.rcParams["axes.labelsize"] = FONT_SIZE_AXIS_LABEL
    matplotlib.rcParams["xtick.labelsize"] = FONT_SIZE_TICK_LABEL
    matplotlib.rcParams["ytick.labelsize"] = FONT_SIZE_TICK_LABEL
    matplotlib.rcParams["legend.fontsize"] = 8
    matplotlib.rcParams["figure.dpi"] = 300
    matplotlib.rcParams["savefig.dpi"] = 300

    _configured = True


def build_global_color_map(entity_names: List[str]) -> Dict[str, str]:
    """Build a deterministic, colorblind-safe ``entity name -> hex color`` map.

    The mapping is built once per export (sorted order) and passed into every
    plot so the same tool/entity always gets the same color across figures.
    """
    configure_publication_style()

    sorted_names = sorted(set(entity_names))
    if not sorted_names:
        return {}

    palette = glasbey.create_palette(
        palette_size=max(1, len(sorted_names)),
        colorblind_safe=True,
        cvd_type="deuteranomaly",
        as_hex=True,
    )

    return dict(zip(sorted_names, list(palette)))


def figure_size_for(n_groups: int) -> Tuple[float, float]:
    raw_width = MIN_WIDTH_PER_GROUP_INCHES * n_groups + 1.5
    width = (
        SINGLE_COLUMN_WIDTH_INCHES
        if raw_width <= SINGLE_COLUMN_WIDTH_INCHES
        else DOUBLE_COLUMN_WIDTH_INCHES
    )

    # Height that would keep aspect ratio at the midpoint of the band.
    target_ratio = (MIN_ASPECT_RATIO + MAX_ASPECT_RATIO) / 2
    height = width / target_ratio
    height = min(max(height, MIN_HEIGHT_INCHES), MAX_HEIGHT_INCHES)

    return width, height

def apply_plot_style(ax: Axes) -> None:
    """Apply shared axes styling: spines, gridlines, and label sizes."""
    configure_publication_style()

    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Gridlines: horizontal only, light gray, drawn behind the data.
    ax.set_axisbelow(True)
    ax.grid(axis="y", color=GRID_COLOR, alpha=GRID_ALPHA, linewidth=0.8, zorder=0)
    ax.grid(axis="x", visible=False)

    ax.tick_params(axis="x", labelsize=FONT_SIZE_TICK_LABEL)
    ax.tick_params(axis="y", labelsize=FONT_SIZE_TICK_LABEL)
    ax.set_xlabel("", labelpad=2)


def apply_y_headroom(ax: Axes, frac: float = Y_HEADROOM) -> None:
    """Leave ~5-10% headroom above/below the plotted data range."""
    ax.margins(y=frac)