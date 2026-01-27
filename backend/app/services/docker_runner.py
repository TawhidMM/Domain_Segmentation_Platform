import subprocess
import json
import os
from datetime import datetime, timezone


class DockerExecutionError(Exception):
    pass


def run_docker(
    cmd: list,
    workspace: dict,
    timeout: int = None
):
    logs_dir = workspace["logs"]
    os.makedirs(logs_dir, exist_ok=True)

    stdout_path = os.path.join(logs_dir, "docker_stdout.log")
    stderr_path = os.path.join(logs_dir, "docker_stderr.log")

    start_time = datetime.now(timezone.utc)

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        raise DockerExecutionError("Docker execution timed out")

    with open(stdout_path, "w") as f:
        f.write(stdout)

    with open(stderr_path, "w") as f:
        f.write(stderr)

    execution_meta = {
        "command": cmd,
        "return_code": process.returncode,
        "started_at": start_time.isoformat(),
        "finished_at": datetime.now(timezone.utc).isoformat()
    }

    with open(os.path.join(logs_dir, "execution.json"), "w") as f:
        json.dump(execution_meta, f, indent=4)

    if process.returncode != 0:
        raise DockerExecutionError(
            "Tool execution failed. Check docker_stderr.log"
        )

    return stdout
