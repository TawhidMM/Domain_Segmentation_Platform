import json
from pathlib import Path

from app.core.config import settings
from app.core.workspace import RunContext
from app.services.docker_runner import run_docker
from app.tools.loader import load_adapter
from app.tools.registry import TOOLS
from app.utils.metrics import load_and_align, spatial_weights, compute_silhouette, compute_davies_bouldin, \
    compute_calinski_harabasz, morans_I, gearys_C


def run_tool(run_context: RunContext):
    tool = TOOLS[run_context.tool_name.lower()]

    adapter = load_adapter(tool["adapter"], run_context)

    adapter.prepare_inputs()
    print("input files prepared")
    adapter.build_config()
    print("config built")

    container_workspace = settings.CONTAINER_WORKSPACE_PATH

    workspace_root = run_context.workspace_root

    config_dir = run_context.config_dir
    relative_config_dir = config_dir.relative_to(workspace_root)

    relative_workspace_path = workspace_root.relative_to(settings.EXPERIMENTS_ROOT)
    host_path = settings.HOST_EXPERIMENTS_ROOT / relative_workspace_path

    print(f"host path : {host_path}")

    container_config_path = (
            container_workspace
             / relative_config_dir
             / tool["config_file"]
    )

    cmd = [
        "docker", "run", "--rm",
        "--gpus", "all",
        "-v", f"{host_path}:{container_workspace}",
        tool["image"],
        str(container_config_path)
    ]

    run_docker(cmd, run_context.logs_dir)

    print("tool finished")

    result = adapter.build_frontend_output()

    print("result creation done")

    run_context.result_file.write_text(json.dumps(result, indent=2))



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
