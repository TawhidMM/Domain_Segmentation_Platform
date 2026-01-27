import json
import os
import shutil
import uuid
from datetime import datetime, timezone

from app.utils.filesystem import create_experiment_dirs


def create_experiment(
    space_ranger_zip,
    tool_name: str,
    experiment_name: str = None
) -> str:

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    job_id = f"exp_{timestamp}_{uuid.uuid4().hex[:4]}"

    exp_paths = create_experiment_dirs(job_id)

    metadata = {
        "job_id": job_id,
        "tool": tool_name,
        "experiment_name": experiment_name,
        "status": "submitted",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    with open(os.path.join(exp_paths["root"], "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)

    return job_id