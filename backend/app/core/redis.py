from redis import Redis
from app.core.config import settings


redis_client = Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    max_connections=20
)

# Centralized Cache Expiration TTLs (in seconds)
RESULT_VALIDATION_SESSION_TTL = 3600


# Keyspace Generator Functions
def get_result_validation_key(
    stage_id: str
) -> str:

    return f"validation:{stage_id}"