import logging
import shutil
from datetime import datetime, timedelta, timezone
import time

from sqlalchemy.orm import Session

from app.core.storage_space import DatasetSpace, StagingSpace
from app.core.workspace import ExperimentWorkspace
from app.models import Dataset, Experiment

logger = logging.getLogger(__name__)


def purge_old_experiments(
    db: Session,
    expiration_limit: datetime
) -> int:

    expired_exps = db.query(Experiment).filter(
        Experiment.started_at <= expiration_limit
    ).all()

    count = 0
    for exp in expired_exps:
        logger.info(f"Processing cleanup for Experiment: {exp.id}")

        workspace = ExperimentWorkspace(str(exp.id))
        if workspace.workspace_root.exists():
            try:
                shutil.rmtree(workspace.workspace_root)
                logger.info(f"Wiped workspace directory on disk for exp {exp.id}")
            except Exception as e:
                logger.error(f"Failed removing workspace dir {workspace.workspace_root}: {e}")

        db.delete(exp)
        count += 1

    return count


def purge_old_datasets(
    db: Session,
    expiration_limit: datetime
) -> int:

    expired_datasets = db.query(Dataset).filter(
        Dataset.created_at <= expiration_limit
    ).all()

    count = 0
    for dataset in expired_datasets:
        logger.info(f" Processing cleanup for Dataset: {dataset.dataset_id}")

        space = DatasetSpace(str(dataset.dataset_id))
        if space.internal_root.exists():
            shutil.rmtree(space.internal_root)
            logger.info(f" Wiped core extracted Dataset directories on disk.")

        db.delete(dataset)
        count += 1

    return count


def purge_old_staging_files(days_to_keep: int = 3) -> int:
    staging_base = StagingSpace.base_directory()

    if not staging_base.exists():
        logger.warning(f" Staging base directory does not exist: {staging_base}")
        return 0

    purged_count = 0
    now = time.time()
    max_age_seconds = days_to_keep * 24 * 60 * 60

    logger.info(f" Scanning filesystem at '{staging_base}' for orphaned folders older than {days_to_keep} days...")

    for stage_folder in staging_base.iterdir():
        if stage_folder.is_dir():

            folder_modified_time = stage_folder.stat().st_mtime
            age_seconds = now - folder_modified_time

            if age_seconds > max_age_seconds:
                try:
                    shutil.rmtree(stage_folder)
                    logger.info(
                        f"Disk Cleaned: Expired staging folder {stage_folder.name} (Age: {age_seconds / 86400:.1f} days)")
                    purged_count += 1
                except Exception as e:
                    logger.error(f"Failed to delete staging folder {stage_folder.name}: {str(e)}")

    return purged_count


def run_cleanup(db: Session) -> None:
    EXPIRE_AFTER_DAYS = 4
    limit_time = datetime.now(timezone.utc) - timedelta(days=EXPIRE_AFTER_DAYS)
    logger.info(" Triggering system-wide storage purge...")

    try:
        purged_staging_folders = purge_old_staging_files(EXPIRE_AFTER_DAYS)
        purged_exps = purge_old_experiments(db, limit_time)
        purged_data = purge_old_datasets(db, limit_time)

        db.commit()
        logger.info(f" Maintenance successful. Purged {purged_exps} Experiments and {purged_data} Datasets and {purged_staging_folders} Staging Folders.")
    except Exception as e:
        db.rollback()
        logger.error(f" CRITICAL: Maintenance transaction failed and rolled back. Error: {str(e)}")
        raise e