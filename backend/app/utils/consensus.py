from typing import List, Tuple
import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment
from scipy.stats import mode



def align_tool_labels(
    reference_labels: np.ndarray,
    tool_labels: np.ndarray
) -> np.ndarray:

    ref_unique, ref_inverse = np.unique(reference_labels, return_inverse=True)
    tool_unique, tool_inverse = np.unique(tool_labels, return_inverse=True)

    if ref_unique.size == 0 or tool_unique.size == 0:
        return tool_labels

    confusion = np.zeros((ref_unique.size, tool_unique.size), dtype=int)

    np.add.at(confusion, (ref_inverse, tool_inverse), 1)

    row_ind, col_ind = linear_sum_assignment(-confusion)

    mapping = {tool_unique[c]: ref_unique[r] for r, c in zip(row_ind, col_ind)}

    # fallback mapping for unmatched clusters ( len(ref_unique) != len(tool_unique) )
    for tool_label in tool_unique:
        if tool_label not in mapping:
            col = np.where(tool_unique == tool_label)[0][0]
            best_row = np.argmax(confusion[:, col])
            mapping[tool_label] = ref_unique[best_row]

    return np.vectorize(mapping.get)(tool_labels).astype(int)


def compute_consensus_and_confidence(
    aligned_labels: np.ndarray,
    reference_labels: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:

    tool_count = aligned_labels.shape[0]

    consensus, counts = mode(aligned_labels, axis=0, keepdims=False)

    confidence = counts / float(tool_count)

    # handle tiebreaking with reference labels
    for i in np.where(counts < tool_count)[0]:
        labels = aligned_labels[:, i]
        unique, c = np.unique(labels, return_counts=True)
        tied = unique[c == c.max()]
        if reference_labels[i] in tied:
            consensus[i] = reference_labels[i]
        else:
            consensus[i] = tied.min()

    return consensus.astype(int), confidence.astype(float)


def build_label_matrix(
    run_dfs: List[pd.DataFrame]
) -> Tuple[np.ndarray, List[str]]:

    common_barcodes = sorted(list(
        set.intersection(*(set(df["barcode"]) for df in run_dfs))
    ))

    # Build label matrix aligned by common barcodes
    labels_matrix = []
    for df in run_dfs:
        df_aligned = df.set_index("barcode").loc[common_barcodes]
        labels = df_aligned["domain"].to_numpy().astype(int)
        labels_matrix.append(labels)

    return np.array(labels_matrix), common_barcodes
