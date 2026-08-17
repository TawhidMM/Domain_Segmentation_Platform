from typing import Dict, List

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.figure import Figure
from matplotlib.lines import Line2D

from app.core.metrics_schema import METRICS
from app.visualization.plot_style import (
    BOX_FILL_ALPHA,
    FONT_SIZE_ANNOTATION,
    MARKER_COLOR,
    POINT_ALPHA,
    POINT_COLOR,
    POINT_SIZE,
    SINGLE_POINT_MARKER,
    SINGLE_POINT_SIZE,
    SINGLE_POINT_EDGE_COLOR,
    MAX_X_LABEL_LENGTH_FLAT,
    apply_plot_style,
    apply_y_headroom,
    configure_publication_style,
    figure_size_for,
)


def _build_dataframe(
    experiment_metric_dict: Dict[str, List[float]],
    label_map: Dict[str, str],
) -> pd.DataFrame:

    if not experiment_metric_dict:
        raise ValueError("experiment_metric_dict is empty")

    rows = []
    for experiment_id, metric_values in experiment_metric_dict.items():
        for value in metric_values:
            rows.append({
                "experiment": experiment_id,
                "label": label_map.get(experiment_id, experiment_id),
                "value": float(value),
            })

    if not rows:
        raise ValueError("No values available to plot")

    return pd.DataFrame(rows)


def _apply_x_tick_labels(
    ax,
    order: List[str],
    label_map: Dict[str, str],
    dataframe: pd.DataFrame,
) -> None:
    """Set tool-name tick labels with ``(n=...)`` and conditional rotation."""
    n_per_group = dataframe.groupby("experiment")["value"].count()
    tick_labels = [
        f"{label_map.get(eid, eid)}\n(n={int(n_per_group.get(eid, 0))})"
        for eid in order
    ]
    max_label_len = max((len(label_map.get(eid, eid)) for eid in order), default=0)

    ax.set_xticks(np.arange(len(order)))
    ax.set_xticklabels(
        tick_labels,
        fontsize=FONT_SIZE_ANNOTATION,
        rotation=30 if max_label_len > MAX_X_LABEL_LENGTH_FLAT else 0,
        ha="right" if max_label_len > MAX_X_LABEL_LENGTH_FLAT else "center",
        rotation_mode="anchor" if max_label_len > MAX_X_LABEL_LENGTH_FLAT else None,
    )


def create_metric_boxplot(
    metric_name: str,
    experiment_metric_dict: Dict[str, List[float]],
    label_map: Dict[str, str],
    color_map: Dict[str, str],
) -> Figure:

    configure_publication_style()

    dataframe = _build_dataframe(experiment_metric_dict, label_map)
    order: List[str] = list(experiment_metric_dict.keys())
    metric_label = METRICS.get(metric_name)["label"]

    fig, ax = plt.subplots(figsize=figure_size_for(len(order)))

    color_by_experiment = {
        experiment_id: color_map.get(label_map.get(experiment_id, experiment_id), "#9CA3AF")
        for experiment_id in order
    }

    # Draw box plots only for groups with more than one observation. Single-run
    # groups (n==1) are drawn as a single distinct marker to avoid implying
    # measured spread or producing overlapping median/mean lines.
    n_per_group = dataframe.groupby("experiment")["value"].count()

    for offset, experiment_id in enumerate(order):
        values = dataframe.loc[dataframe["experiment"] == experiment_id, "value"].to_numpy()
        if int(n_per_group.get(experiment_id, 0)) > 1:
            bp = ax.boxplot(
                [values],
                positions=[offset],
                widths=0.6,
                patch_artist=True,
                showfliers=False,
                manage_ticks=False,
                zorder=2,
            )

            # Style elements to match previous seaborn appearance
            box = bp["boxes"][0]
            box.set_facecolor(color_by_experiment.get(experiment_id, "#9CA3AF"))
            box.set_alpha(BOX_FILL_ALPHA)
            box.set_linewidth(0.8)
            box.set_edgecolor(MARKER_COLOR)

            for whisker in bp.get("whiskers", []):
                whisker.set_color("#6B7280")
                whisker.set_linewidth(1.1)
                whisker.set_zorder(3)

            for cap in bp.get("caps", []):
                cap.set_color("#6B7280")
                cap.set_linewidth(1.1)
                cap.set_zorder(3)

            for median_line in bp.get("medians", []):
                median_line.set_color(MARKER_COLOR)
                median_line.set_linewidth(2.0)
                median_line.set_zorder(30)

            # Draw explicit dashed mean line on top of the box for multi-run groups
            mean = float(np.mean(values))
            ax.plot(
                [offset - 0.30, offset + 0.30],
                [mean, mean],
                color=MARKER_COLOR,
                linewidth=1.7,
                linestyle="--",
                solid_capstyle="butt",
                zorder=31,
            )
        else:
            # Single-observation group: don't draw a box or mean/median lines.
            # We'll render the single marker after the stripplot so it sits on top.
            continue

    # Raw values: every point shown, jittered, neutral dark, distinct from boxes.
    sns.stripplot(
        data=dataframe,
        x="experiment",
        y="value",
        order=order,
        ax=ax,
        color=POINT_COLOR,
        alpha=POINT_ALPHA,
        size=POINT_SIZE,
        jitter=0.2,
        zorder=4,
    )

    # Overlay single-run markers (n==1). Draw after the strip plot so the marker
    # is clearly visible and does not get visually merged with the jittered point.
    single_run_present = False
    for offset, experiment_id in enumerate(order):
        n = int(n_per_group.get(experiment_id, 0))

        if n == 1:
            single_run_present = True
            val = float(dataframe.loc[dataframe["experiment"] == experiment_id, "value"].to_numpy()[0])
            ax.scatter(
                offset,
                val,
                marker=SINGLE_POINT_MARKER,
                s=SINGLE_POINT_SIZE,
                facecolor=color_by_experiment.get(experiment_id, POINT_COLOR),
                edgecolor=SINGLE_POINT_EDGE_COLOR,
                linewidth=0.6,
                zorder=40,
            )

    ax.set_ylabel(metric_label)
    _apply_x_tick_labels(ax, order, label_map, dataframe)

    apply_y_headroom(ax)

    apply_plot_style(ax)

    # Minimal legend explaining the summary markers (median = solid, mean = dashed).
    legend_handles = [
        Line2D([0], [0], color=MARKER_COLOR, linewidth=1.8, linestyle="-", label="Median"),
        Line2D([0], [0], color=MARKER_COLOR, linewidth=1.6, linestyle="--", label="Mean"),
    ]
    if single_run_present:
        legend_handles.append(
            Line2D([0], [0], marker=SINGLE_POINT_MARKER, color="none", label="Single run (n=1)",
                   markerfacecolor=MARKER_COLOR, markeredgecolor=SINGLE_POINT_EDGE_COLOR, markersize=6)
        )
    ax.legend(
        handles=legend_handles,
        fontsize=FONT_SIZE_ANNOTATION,
        loc="upper left",
        bbox_to_anchor=(1.0, 1.0),
        borderaxespad=0.5,
        frameon=False,
    )

    fig.tight_layout()

    return fig


def create_metric_barplot(
    metric_name: str,
    experiment_metric_dict: Dict[str, List[float]],
    label_map: Dict[str, str],
    color_map: Dict[str, str],
) -> Figure:

    configure_publication_style()

    dataframe = _build_dataframe(experiment_metric_dict, label_map)
    order: List[str] = list(experiment_metric_dict.keys())
    metric_label = METRICS.get(metric_name)["label"]

    stats = dataframe.groupby("experiment")["value"].mean()
    heights = [float(stats.loc[eid]) for eid in order]

    fig, ax = plt.subplots(figsize=figure_size_for(len(order)))

    # Bar per experiment, filled with its tool color from the global map so the
    # mapping stays identical across every figure in the export.
    bar_colors = [
        color_map.get(label_map.get(eid, eid), "#9CA3AF")
        for eid in order
    ]
    ax.bar(
        np.arange(len(order)),
        heights,
        width=0.62,
        color=bar_colors,
        alpha=BOX_FILL_ALPHA,
        edgecolor=MARKER_COLOR,
        linewidth=0.8,
        zorder=3,
    )

    # Value annotation above each bar.
    for offset, height in enumerate(heights):
        ax.text(
            offset,
            height,
            f"{height:.4g}",
            ha="center",
            va="bottom",
            fontsize=FONT_SIZE_ANNOTATION,
            zorder=5,
        )

    ax.set_ylabel(metric_label)
    _apply_x_tick_labels(ax, order, label_map, dataframe)

    # A little more headroom than the box-plots so the value annotations never
    # touch the plot edge.
    apply_y_headroom(ax, frac=0.14)

    apply_plot_style(ax)
    fig.tight_layout()

    return fig
