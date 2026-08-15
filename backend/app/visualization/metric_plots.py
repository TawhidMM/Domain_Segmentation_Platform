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

    sns.boxplot(
        data=dataframe,
        x="experiment",
        y="value",
        hue="experiment",
        order=order,
        hue_order=order,
        ax=ax,
        palette=color_by_experiment,
        linewidth=1.2,
        width=0.6,
        showfliers=False,
        legend=False,
        boxprops=dict(alpha=BOX_FILL_ALPHA, zorder=2),
        whiskerprops=dict(color="#6B7280", linewidth=1.1, zorder=3),
        capprops=dict(color="#6B7280", linewidth=1.1, zorder=3),
        medianprops=dict(color=MARKER_COLOR, linewidth=2.0, zorder=30),
    )

    # Mean marker drawn on top of each box. The box's built-in solid line already
    # represents the median, so we only draw an explicit dashed mean line (kept at
    # a higher z-order so it stays visible even when mean == median).
    for offset, experiment_id in enumerate(order):
        values = dataframe.loc[dataframe["experiment"] == experiment_id, "value"].to_numpy()
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

    ax.set_ylabel(metric_label)
    _apply_x_tick_labels(ax, order, label_map, dataframe)

    apply_y_headroom(ax)

    apply_plot_style(ax)

    # Minimal legend explaining the summary markers (median = solid, mean = dashed).
    legend_handles = [
        Line2D([0], [0], color=MARKER_COLOR, linewidth=1.8, linestyle="-", label="Median"),
        Line2D([0], [0], color=MARKER_COLOR, linewidth=1.6, linestyle="--", label="Mean"),
    ]
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
