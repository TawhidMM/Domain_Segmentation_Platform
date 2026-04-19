from typing import Dict, List

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from matplotlib.figure import Figure


METRIC_LABELS = {
    "silhouette": "Silhouette",
    "davies_bouldin": "Davies-Bouldin",
    "calinski_harabasz": "Calinski-Harabasz",
    "moran_i": "Moran's I",
    "geary_c": "Geary's C"
}


def create_metric_boxplot(
    metric_name: str,
    experiment_metric_dict: Dict[str, List[float]]
) -> Figure:
    if not experiment_metric_dict:
        raise ValueError("experiment_metric_dict is empty")

    rows = []
    for experiment_name, metric_values in experiment_metric_dict.items():
        for value in metric_values:
            rows.append({
                "experiment": experiment_name,
                "value": float(value)
            })

    if not rows:
        raise ValueError(f"No values available to plot for metric: {metric_name}")

    metric_label = METRIC_LABELS.get(metric_name, metric_name.replace("_", " ").title())
    order = list(experiment_metric_dict.keys())
    dataframe = pd.DataFrame(rows)

    sns.set_theme(style="whitegrid", context="paper")
    palette = sns.color_palette("colorblind", n_colors=max(1, len(order)))

    fig, ax = plt.subplots(figsize=(7.0, 4.8), dpi=300)

    sns.boxplot(
        data=dataframe,
        x="experiment",
        y="value",
        order=order,
        ax=ax,
        palette=palette,
        linewidth=1.2,
        fliersize=2.5
    )

    sns.stripplot(
        data=dataframe,
        x="experiment",
        y="value",
        order=order,
        ax=ax,
        color="#111827",
        alpha=0.45,
        size=2.5,
        jitter=0.2
    )

    ax.set_xlabel("Experiment / Tool", fontsize=11)
    ax.set_ylabel(metric_label, fontsize=11)
    ax.set_title(f"{metric_label} Across Experiments", fontsize=12, fontweight="bold")
    ax.tick_params(axis="x", rotation=20, labelsize=10)
    ax.tick_params(axis="y", labelsize=10)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    fig.tight_layout()
    return fig
