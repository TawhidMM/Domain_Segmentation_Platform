from celery import Celery
from celery.schedules import crontab
from app.core.config import settings


celery_app = Celery(
    "spatial_app",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.experiment_tasks",
        "app.tasks.cleanup_tasks"
    ]
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
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



celery_app.conf.beat_schedule = {
    'nightly-storage-sweep': {
        'task': 'app.tasks.cleanup_tasks.run_system_cleanup_task',
        'schedule': crontab(hour=2, minute=0),
    },
}

if __name__ == "__main__":
    celery_app.start()