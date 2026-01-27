from app.core.config import EXPERIMENTS_ROOT

def create_experiment_dirs(job_id: str) -> dict:
    root = EXPERIMENTS_ROOT / f"{job_id}"

    paths = {
        "root": root,
        "input_dir": root / "input",
        "config_dir": root / "config",
        "output_dir": root / "outputs",
        "logs_dir": root / "logs",
    }

    for p in paths.values():
        p.mkdir(parents=True, exist_ok=True)

    return paths
