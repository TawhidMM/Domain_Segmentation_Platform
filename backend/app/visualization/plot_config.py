from typing import Tuple, Optional
import matplotlib.pyplot as plt


class PublicationPlotConfig:
    """Centralized configuration for publication-quality plots."""

    # Typography (research-grade)
    FONT_FAMILY = "DejaVu Sans"
    FONT_SIZE_BASE = 9
    FONT_SIZE_LABEL = 10
    FONT_SIZE_TITLE = 10
    FONT_SIZE_TICK = 8

    # Figure sizes (IEEE / NeurIPS / ICML / CVPR compatible)
    SINGLE_COLUMN_WIDTH = 3.5
    DOUBLE_COLUMN_WIDTH = 7.0
    STANDARD_HEIGHT = 2.6
    TALL_HEIGHT = 4.0

    # Colors and styling
    COLOR_MEDIAN = "black"
    COLOR_MEAN = "red"
    COLOR_GRID = "gray"
    MEDIAN_LINEWIDTH = 2.0
    GRID_LINEWIDTH = 0.5
    GRID_ALPHA = 0.5
    GRID_STYLE = "--"

    # DPI for export
    DPI = 300

    @classmethod
    def apply_global_style(cls):
        """Apply publication-grade matplotlib settings globally."""
        plt.rcParams.update({
            "svg.fonttype": "none",
            "font.family": cls.FONT_FAMILY,
            "font.size": cls.FONT_SIZE_BASE,
            "axes.labelsize": cls.FONT_SIZE_LABEL,
            "axes.titlesize": cls.FONT_SIZE_TITLE,
            "xtick.labelsize": cls.FONT_SIZE_TICK,
            "ytick.labelsize": cls.FONT_SIZE_TICK,
        })

    @classmethod
    def get_single_column_figsize(cls, aspect_ratio: Optional[float] = None) -> Tuple[float, float]:
        """Get single-column figure size (3.5 x 2.6 inches by default)."""
        height = cls.STANDARD_HEIGHT
        if aspect_ratio:
            height = cls.SINGLE_COLUMN_WIDTH / aspect_ratio
        return (cls.SINGLE_COLUMN_WIDTH, height)

    @classmethod
    def get_double_column_figsize(cls, aspect_ratio: Optional[float] = None) -> Tuple[float, float]:
        """Get double-column figure size (7.0 inches wide)."""
        height = cls.TALL_HEIGHT
        if aspect_ratio:
            height = cls.DOUBLE_COLUMN_WIDTH / aspect_ratio
        return (cls.DOUBLE_COLUMN_WIDTH, height)

    @classmethod
    def get_adaptive_figsize(cls, num_items: int, single_column: bool = True) -> Tuple[float, float]:
        """
        Calculate figure width based on number of items.

        Args:
            num_items: Number of experiments/tools/etc to plot
            single_column: If True, use single-column layout

        Returns:
            (width, height) in inches
        """
        if single_column:
            base_width = cls.SINGLE_COLUMN_WIDTH
            height = cls.STANDARD_HEIGHT
        else:
            base_width = cls.DOUBLE_COLUMN_WIDTH
            height = cls.TALL_HEIGHT

        # Scale width based on number of items (0.6 inches per item, minimum base width)
        width = max(base_width, 0.6 * num_items)
        return (width, height)

    @classmethod
    def configure_axes(
        cls,
        ax,
        xlabel: str = "",
        ylabel: str = "",
        title: str = "",
        show_grid: bool = True,
        grid_axis: str = "y",
        rotate_xlabel: bool = False,
        rotation_angle: int = 15
    ):
        """
        Apply standard axis styling.

        Args:
            ax: Matplotlib axis
            xlabel: X-axis label
            ylabel: Y-axis label
            title: Plot title
            show_grid: Whether to show grid
            grid_axis: "x", "y", or "both" for grid
            rotate_xlabel: Whether to rotate x labels
            rotation_angle: Rotation angle in degrees
        """
        if xlabel:
            ax.set_xlabel(xlabel, fontsize=cls.FONT_SIZE_LABEL)
        if ylabel:
            ax.set_ylabel(ylabel, fontsize=cls.FONT_SIZE_LABEL)
        if title:
            ax.set_title(title, fontsize=cls.FONT_SIZE_TITLE, fontweight="bold")

        if show_grid:
            ax.grid(
                axis=grid_axis,
                linestyle=cls.GRID_STYLE,
                linewidth=cls.GRID_LINEWIDTH,
                alpha=cls.GRID_ALPHA,
                color=cls.COLOR_GRID
            )
            ax.set_axisbelow(True)

        # Remove top and right spines
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_linewidth(0.8)
        ax.spines["bottom"].set_linewidth(0.8)

        if rotate_xlabel:
            ax.tick_params(axis="x", rotation=rotation_angle)

    @classmethod
    def apply_tight_layout(cls, fig):
        """Apply tight layout for consistent padding."""
        fig.tight_layout()
        return fig

