from fastapi import APIRouter
from fastapi.responses import JSONResponse
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import engine
from app.core.redis import redis_client


router = APIRouter()


@router.get("/health")
def health_check() -> JSONResponse:
    dependencies = {"database": "ok", "redis": "ok"}

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        dependencies["database"] = "failed"

    try:
        redis_client.ping()
    except RedisError:
        dependencies["redis"] = "failed"

    if "failed" in dependencies.values():
        return JSONResponse(
            status_code=503,
            content={"status": "error", "dependencies": dependencies},
        )

    return JSONResponse(status_code=200, content={"status": "ok"})
