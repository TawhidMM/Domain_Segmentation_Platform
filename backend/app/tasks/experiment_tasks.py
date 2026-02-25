from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.services.experiment_service import (
    mark_running,
    mark_finished,
    mark_failed,
)
from app.repositories import dataset_repository
from app.services.tool_executor import run_tool


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 0}
)
def run_experiment_task(
    self,
    job_id: str,
    tool_name: str,
    params_dict: dict,
    dataset_id: str
):

    db = SessionLocal()

    try:
        dataset = dataset_repository.get_dataset_by_id(db, dataset_id)
        if not dataset:
            mark_failed(db, job_id)
            return

        mark_running(db, job_id)

        run_tool(job_id, tool_name, params_dict, dataset.dataset_id)

        mark_finished(db, job_id)

    except Exception as e:
        mark_failed(db, job_id)
        raise e

    finally:
        db.close()
