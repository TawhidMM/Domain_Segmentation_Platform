from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Integer, TIMESTAMP
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExperimentStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


VALID_EXPERIMENT_TRANSITIONS = {
    ExperimentStatus.QUEUED: {ExperimentStatus.RUNNING, ExperimentStatus.FAILED},
    ExperimentStatus.RUNNING: {ExperimentStatus.COMPLETED, ExperimentStatus.FAILED},
    ExperimentStatus.COMPLETED: set(),
    ExperimentStatus.FAILED: {ExperimentStatus.RUNNING},
}


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String, primary_key=True)

    tool_id = Column(String(50), nullable=False, index=True)
    experiment_name = Column(String(255), nullable=False)

    workspace_path = Column(String, nullable=False)

    total_runs = Column(Integer, nullable=False)
    completed_runs = Column(Integer, default=0)

    status = Column(SAEnum(ExperimentStatus), nullable=False)

    access_token_hash = Column(String, nullable=False)

    started_at = Column(TIMESTAMP, nullable=False, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)

    run_configs = relationship(
        "RunConfig",
        backref="experiment",
        cascade="all, delete-orphan"
    )