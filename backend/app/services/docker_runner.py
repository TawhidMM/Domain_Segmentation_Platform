import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


class DockerExecutionError(Exception):
    pass


def run_docker(
    cmd: list,
    logs_dir: Path,
    timeout: int = None
):
    print("Entered run_docker")
    logs_dir.mkdir(parents=True, exist_ok=True)

    stdout_path = logs_dir / "docker_stdout.log"
    stderr_path = logs_dir / "docker_stderr.log"

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

    stdout_path.write_text(stdout)
    stderr_path.write_text(stderr)

    execution_meta = {
        "command": cmd,
        "return_code": process.returncode,
        "started_at": start_time.isoformat(),
        "finished_at": datetime.now(timezone.utc).isoformat()
    }

    execution_path = logs_dir / "execution.json"
    execution_path.write_text(json.dumps(execution_meta, indent=4))

    if process.returncode != 0:
        raise DockerExecutionError(
            "Tool execution failed. Check docker_stderr.log"
        )

    return stdout
