from pathlib import Path
from typing import ClassVar, Optional

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

    # Paths (computed after initialization)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    EXPERIMENTS_ROOT: Optional[Path] = None
    UPLOAD_ROOT: Optional[Path] = None

    # Constants
    CONTAINER_WORKSPACE_PATH: ClassVar[Path] = Path("/workspace")
    EXPERIMENT_DIR: ClassVar[str] = "experiments"
    UPLOAD_DIR: ClassVar[str] = "uploads"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        env_ignore_empty=True,
    )

    def model_post_init(self, __context) -> None:

        if self.EXPERIMENTS_ROOT is None:
            self.EXPERIMENTS_ROOT = self.BASE_DIR / self.EXPERIMENT_DIR
        if self.UPLOAD_ROOT is None:
            self.UPLOAD_ROOT = self.BASE_DIR / self.UPLOAD_DIR

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

