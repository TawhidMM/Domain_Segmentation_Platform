import json
from pathlib import Path

from app.services.tool_executor import get_segmentation_metrics

prediction_file = Path("experiments/exp_20260205_125959_4803/outputs/predictions.csv")
coords_file = Path("experiments/exp_20260205_125959_4803/input/spatial/tissue_positions_list.csv")
embeddings_file = Path("experiments/exp_20260205_125959_4803/outputs/embeddings.csv")

metrics = get_segmentation_metrics(prediction_file, coords_file, embeddings_file)
result_path = "metrics.json"
with open(result_path, "w") as f:
    json.dump(metrics, f)