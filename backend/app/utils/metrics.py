from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import silhouette_score
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import davies_bouldin_score
from sklearn.metrics import calinski_harabasz_score


def load_and_align(
    pred_csv: Path,
    emb_csv: Path,
    coord_csv: Path
):
    # Read with barcode as index
    pred = pd.read_csv(pred_csv, index_col=0)
    emb = pd.read_csv(emb_csv, index_col=0)
    coord = pd.read_csv(coord_csv, index_col=0)

    # Intersection: keep only barcodes in all three files
    common = pred.index.intersection(emb.index).intersection(coord.index)
    if len(common) == 0:
        raise ValueError("No common barcodes found across the three files")

    # Align order
    pred = pred.loc[common]
    emb = emb.loc[common]
    coord = coord.loc[common]

    # Labels
    if "domain" not in pred.columns:
        raise ValueError("Column 'domain' missing in prediction file")
    labels = pred["domain"].to_numpy()

    # Embeddings: all numeric columns in emb
    emb_num = emb.select_dtypes(include=np.number)
    if emb_num.empty:
        raise ValueError("No numeric columns found in embedding file")
    embeddings = emb_num.to_numpy()

    # Coordinates: simply take the **last two columns** of coord
    if len(coord.columns) < 2:
        raise ValueError("coord file has fewer than 2 columns")

    coords = coord.iloc[:, [-1, -2]].to_numpy()  # last two columns

    return labels, embeddings, coords


def compute_silhouette(
    embeddings: np.ndarray,
    labels: np.ndarray,
    metric: str = "euclidean"
) -> float:
    """
    embeddings: (n_spots, n_features)
    labels: (n_spots,)
    """
    if len(set(labels)) < 2:
        return float("nan")

    return silhouette_score(
        embeddings,
        labels,
        metric=metric
    )



def spatial_weights(
    coords: np.ndarray,
    k: int = 6
) -> np.ndarray:
    """
    coords: (n_spots, 2)
    returns: binary spatial adjacency matrix W
    """
    n = coords.shape[0]
    nbrs = NearestNeighbors(n_neighbors=k + 1).fit(coords)
    _, indices = nbrs.kneighbors(coords)

    W = np.zeros((n, n))
    for i in range(n):
        for j in indices[i][1:]:
            W[i, j] = 1
            W[j, i] = 1

    return W


def morans_I(
    values: np.ndarray,
    W: np.ndarray
) -> float:
    """
    values: (n_spots,)
    W: spatial weights matrix
    """
    x = values.astype(float)
    x_mean = x.mean()
    n = len(x)

    num = 0.0
    den = np.sum((x - x_mean) ** 2)
    W_sum = W.sum()

    for i in range(n):
        for j in range(n):
            num += W[i, j] * (x[i] - x_mean) * (x[j] - x_mean)

    return (n / W_sum) * (num / den)


def gearys_C(
    values: np.ndarray,
    W: np.ndarray
) -> float:
    x = values.astype(float)
    x_mean = x.mean()
    n = len(x)

    num = 0.0
    den = np.sum((x - x_mean) ** 2)
    W_sum = W.sum()

    for i in range(n):
        for j in range(n):
            num += W[i, j] * (x[i] - x[j]) ** 2

    return ((n - 1) / (2 * W_sum)) * (num / den)



def compute_davies_bouldin(
    embeddings: np.ndarray,
    labels: np.ndarray
) -> float:
    if len(set(labels)) < 2:
        return float("nan")

    return davies_bouldin_score(
        embeddings,
        labels
    )



def compute_calinski_harabasz(
    embeddings: np.ndarray,
    labels: np.ndarray
) -> float:
    if len(set(labels)) < 2:
        return float("nan")

    return calinski_harabasz_score(
        embeddings,
        labels
    )
