import json

from app.core.config import FRONTEND_RESULT_FILENAME
from app.services.docker_runner import run_docker
from app.tools.loader import load_adapter
from app.tools.registry import TOOLS
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
