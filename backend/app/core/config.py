from pathlib import Path
from typing import ClassVar

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App settings
    APP_ENV: str = "development"
    SECRET_KEY: str

    # Database credentials
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432

    # Redis settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    HOST_EXPERIMENTS_ROOT: str
    HOST_UPLOADS_ROOT: str

    # Internal directories
    _BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    _EXPERIMENTS_DIR_NAME: ClassVar[str] = "experiments"
    _UPLOADS_DIR_NAME: ClassVar[str] = "uploads"

    # Container paths
    CONTAINER_WORKSPACE_PATH: ClassVar[Path] = Path("/workspace")
    CONTAINER_DATASET_PATH: ClassVar[Path] = Path("/input")
    CONTAINER_ANNOTATION_PATH: ClassVar[Path] = Path("/annotation/annotations.json")


    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        env_ignore_empty=True,
    )

    @property
    def INTERNAL_EXPERIMENTS_ROOT(self) -> Path:
        return self._BASE_DIR / self._EXPERIMENTS_DIR_NAME

    @property
    def INTERNAL_UPLOAD_ROOT(self) -> Path:
        return self._BASE_DIR / self._UPLOADS_DIR_NAME

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    @computed_field
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"


settings = Settings()

