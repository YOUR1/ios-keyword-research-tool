from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "iosstore",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Rate limit tasks globally
    task_default_rate_limit="20/m",
)

# Periodic task schedule
celery_app.conf.beat_schedule = {
    # Dispatch due keyword crawl jobs every 60 seconds
    "keyword-dispatcher": {
        "task": "app.tasks.keyword_tasks.dispatch_due_keywords",
        "schedule": 60.0,
    },
    # Recompute scores every 6 hours
    "recompute-scores": {
        "task": "app.tasks.crawl_tasks.recompute_scores_task",
        "schedule": crontab(hour="*/6", minute=30),
    },
    # Check proxy provider health every 5 minutes
    "proxy-health-check": {
        "task": "app.tasks.keyword_tasks.check_proxy_health",
        "schedule": 300.0,
    },
    # Clean up expired/revoked refresh tokens daily at 2 AM
    "cleanup-tokens": {
        "task": "app.tasks.keyword_tasks.cleanup_expired_tokens",
        "schedule": crontab(hour=2, minute=0),
    },
    # Crawl customer reviews daily at 3 AM
    "crawl-reviews": {
        "task": "app.tasks.crawl_tasks.crawl_reviews_task",
        "schedule": crontab(hour=3, minute=0),
    },
}

celery_app.autodiscover_tasks(
    ["app.tasks"],
    related_name=None,
    force=True,
)

# Explicitly import task modules to ensure registration
import app.tasks.crawl_tasks  # noqa: F401, E402
import app.tasks.keyword_tasks  # noqa: F401, E402
