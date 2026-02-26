from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment


def pick_reference_index(experiments: list) -> int:
    best_idx = 0
    best_score = None

    for idx, item in enumerate(experiments):
        metrics_path = item["workspace"].metrics_file
        if not metrics_path.exists():
            continue
        try:
            metrics = json.loads(metrics_path.read_text())
        except Exception:
            continue
        score = metrics.get("silhouette")
        if score is None:
            continue
        if best_score is None or score > best_score:
            best_score = score
            best_idx = idx

    return best_idx


def align_tool_labels(reference_labels: np.ndarray, tool_labels: np.ndarray) -> np.ndarray:
    ref_unique = np.unique(reference_labels)
    tool_unique = np.unique(tool_labels)

    if ref_unique.size == 0 or tool_unique.size == 0:
        return tool_labels

    ref_index = {label: i for i, label in enumerate(ref_unique)}
    tool_index = {label: i for i, label in enumerate(tool_unique)}

    confusion = np.zeros((len(ref_unique), len(tool_unique)), dtype=int)
    for ref_label, tool_label in zip(reference_labels, tool_labels):
        confusion[ref_index[ref_label], tool_index[tool_label]] += 1

    cost = -confusion
    row_ind, col_ind = linear_sum_assignment(cost)

    mapping = {tool_unique[c]: ref_unique[r] for r, c in zip(row_ind, col_ind)}

    for tool_label in tool_unique:
        if tool_label in mapping:
            continue
        col = tool_index[tool_label]
        best_row = int(np.argmax(confusion[:, col]))
        mapping[tool_label] = ref_unique[best_row]

    return np.array([mapping[label] for label in tool_labels], dtype=int)


def compute_consensus_and_confidence(
    aligned_labels: np.ndarray,
    reference_labels: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    tool_count, spot_count = aligned_labels.shape
    consensus = np.zeros(spot_count, dtype=int)
    confidence = np.zeros(spot_count, dtype=float)

    for idx in range(spot_count):
        labels = aligned_labels[:, idx]
        unique_labels, counts = np.unique(labels, return_counts=True)
        max_count = counts.max()
        tied_labels = unique_labels[counts == max_count]
        reference_label = int(reference_labels[idx])
        if reference_label in tied_labels:
            consensus_label = reference_label
        else:
            consensus_label = int(tied_labels.min())
        consensus[idx] = consensus_label

        k = unique_labels.size
        if k == 1:
            confidence[idx] = 1.0
            continue
        probs = counts / float(tool_count)
        entropy = -np.sum(probs * np.log(probs))
        max_entropy = np.log(tool_count)
        confidence[idx] = float(1.0 - (entropy / max_entropy))

    return consensus, confidence


def build_label_matrix(
        experiments_data: List[dict]
) -> Tuple[np.ndarray, List[str]]:

    # Convert spots to dataframes for easier intersection
    dfs = []
    for data in experiments_data:
        spots = data["spots"]
        df = pd.DataFrame(spots)
        dfs.append(df)

    # Find intersection of barcodes
    barcode_sets = [set(df["barcode"].unique()) for df in dfs]
    common_barcodes = sorted(list(set.intersection(*barcode_sets)))

    # Build label matrix aligned by common barcodes
    labels_matrix = []
    for df in dfs:
        # Filter to common barcodes and sort
        df_filtered = df[df["barcode"].isin(common_barcodes)].set_index("barcode")
        df_sorted = df_filtered.loc[common_barcodes]
        labels = df_sorted["domain"].values.astype(int)
        labels_matrix.append(labels)

    return np.array(labels_matrix), common_barcodes
