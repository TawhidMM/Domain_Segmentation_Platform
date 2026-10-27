import logging

from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.exceptions.tool_execution_exception import RunExecutionError
from app.repositories import dataset_repository
from app.repositories import run_repository
from app.services.run_service import mark_failed, mark_running, build_run_context, mark_finished
from app.services.tool_executor import ToolExecutor

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def run_task(
    self,
    run_id: str
):
    if not run_id:
        return

    db = SessionLocal()
    run = None
    try:
        run = run_repository.get_run_by_id(db, run_id)
        if not run:
            return

        dataset_id = run.run_config.dataset_id
        dataset = dataset_repository.get_dataset_by_id(db, dataset_id)
        if not dataset:
            mark_failed(db, run, message="Dataset not found")
            return

        mark_running(db, run)

        run_context = build_run_context(db, run)
        tool_executor = ToolExecutor(run_context)
        tool_executor.execute()

        mark_finished(db, run)

    except Exception as exc:
        logger.exception("Run %s failed", run_id)
        db.rollback()

        message = exc.message if isinstance(exc, RunExecutionError) else "Unexpected internal error"

        if run is not None:
            try:
                run = run_repository.get_run_by_id(db, run_id)
                if run is None:
                    logger.critical("Run %s disappeared while recording failure", run_id)
                    return
                mark_failed(db, run, message=message)
            except Exception:
                db.rollback()
                logger.exception("Failed to record failure for run %s", run_id)
        else:
            logger.critical("Run %s could not be loaded and was not marked failed", run_id)

    finally:
        db.close()
