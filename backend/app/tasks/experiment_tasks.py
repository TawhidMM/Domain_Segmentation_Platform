from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.repositories import dataset_repository, run_repository
from app.services.run_service import mark_failed, mark_running, build_run_context, mark_finished
from app.services.tool_executor import run_tool


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 0}
)
def run_task(
    self,
    run_id: str
):

    db = SessionLocal()
    run = None

    try:
        run = run_repository.get_run_by_id(db, run_id)
        if not run:
            return

        # Get dataset_id and params from run_config
        dataset_id = run.run_config.dataset_id
        dataset = dataset_repository.get_dataset_by_id(db, dataset_id)
        if not dataset:
            mark_failed(db, run)
            return

        mark_running(db, run)

        run_context = build_run_context(db, run)
        run_tool(run_context)

        mark_finished(db, run)

    except Exception as e:
        mark_failed(db, run)
        raise e

    finally:
        db.close()
