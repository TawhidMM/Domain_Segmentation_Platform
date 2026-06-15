from app.core.celery import celery_app
from app.core.database import SessionLocal
from app.core.cleanup import run_cleanup


@celery_app.task(name="app.tasks.cleanup_tasks.run_system_cleanup_task")
def run_system_cleanup_task():
    """Wakes up and invokes the 3-day relational DB and storage sweep."""
    with SessionLocal() as db:
        run_cleanup(db)