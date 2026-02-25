from celery import Celery
from app.core.config import settings


celery_app = Celery(
    "spatial_app",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.experiment_tasks"]
)

celery_app.conf.update(
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    result_expires=86400,
    task_track_started=True,

    task_publish_retry=True,
)

if __name__ == "__main__":
    celery_app.start()