import json
from pathlib import Path

from app.core.config import FRONTEND_RESULT_FILENAME
from app.services.docker_runner import run_docker
from app.tools.loader import load_adapter
from app.tools.registry import TOOLS
from app.utils.metrics import load_and_align, spatial_weights, compute_silhouette, compute_davies_bouldin, \
    compute_calinski_harabasz, morans_I, gearys_C
from app.utils.workspace import get_workspace


def run_tool(job_id: str, tool_name: str, user_params: dict, upload_id: str):
    tool = TOOLS[tool_name.lower()]
    workspace = get_workspace(job_id)

    adapter = load_adapter(tool["adapter"], workspace)

    adapter.prepare_inputs(upload_id)
    adapter.build_config(user_params)

    cmd = [
        "docker", "run", "--rm",
        "--gpus", "all",
        "-v", f"{workspace['root']}:/workspace",
        tool["image"],
        f"/workspace/config/{tool['config_file']}"
    ]

    run_docker(cmd, workspace)

    result = adapter.build_frontend_output(job_id)

    result_path = workspace["output"] / FRONTEND_RESULT_FILENAME
    with open(result_path, "w") as f:
        json.dump(result, f)



def get_segmentation_metrics(
        predictions_path: Path,
        coords_path: Path,
        embeddings_path: Path
) -> dict:

    labels, embeddings, coords = load_and_align(
        predictions_path,
        embeddings_path,
        coords_path
    )

    W = spatial_weights(coords, k=6)

    metrics = {
        "silhouette": compute_silhouette(embeddings, labels),
        "davies_bouldin": compute_davies_bouldin(embeddings, labels),
        "calinski_harabasz": compute_calinski_harabasz(embeddings, labels),
        "morans_I": morans_I(labels, W),
        "gearys_C": gearys_C(labels, W)
    }

    return metrics
