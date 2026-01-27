import os
from app.core.config import EXPERIMENTS_ROOT

def get_workspace(job_id: str) -> dict:
    root = EXPERIMENTS_ROOT / job_id

    return {
        "root": root,
        "input": root / "input",
        "config": root / "config",
        "output": root / "outputs",
        "logs": root / "logs"
    }
