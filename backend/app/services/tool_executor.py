import json
import os
from pathlib import Path

from app.core.config import settings
from app.core.workspace import Workspace
from app.services.docker_runner import run_docker
from app.tools.loader import load_adapter
from app.tools.registry import TOOLS
from app.utils.metrics import load_and_align, spatial_weights, compute_silhouette, compute_davies_bouldin, \
    compute_calinski_harabasz, morans_I, gearys_C



def run_tool(job_id: str, tool_name: str, user_params: dict, upload_id: str):
    tool = TOOLS[tool_name.lower()]
    workspace = Workspace(job_id)

    adapter = load_adapter(tool["adapter"], workspace)

    adapter.prepare_inputs(upload_id)
    print("input files prepared")
    adapter.build_config(user_params)
    print("config built")

    container_workspace = settings.CONTAINER_WORKSPACE_PATH
    container_config_path = container_workspace / "config" / tool["config_file"]

    cmd = [
        "docker", "run", "--rm",
        "--gpus", "all",
        "-v", f"{workspace.root_dir}:{container_workspace}",
        tool["image"],
        str(container_config_path)
    ]

    print("Workspace root exists:", workspace.root_dir.exists())
    print("About to call run_docker")

    run_docker(cmd, workspace.logs_dir)

    print("tool finished")

    result = adapter.build_frontend_output(job_id, tool_name)

    print("result creation done")

    workspace.result_file.write_text(json.dumps(result, indent=2))



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
