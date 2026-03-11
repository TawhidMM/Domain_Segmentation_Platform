from enum import Enum

from sqlalchemy import Column, String, DateTime, JSON, Enum as SAEnum, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExperimentStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FINISHED = "finished"
    FAILED = "failed"


VALID_EXPERIMENT_TRANSITIONS = {
    ExperimentStatus.QUEUED: {ExperimentStatus.RUNNING, ExperimentStatus.FAILED},
    ExperimentStatus.RUNNING: {ExperimentStatus.FINISHED, ExperimentStatus.FAILED},
    ExperimentStatus.FINISHED: set(),
    ExperimentStatus.FAILED: {ExperimentStatus.RUNNING},
}


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String, primary_key=True)

    tool_name = Column(String, nullable=False)
    params_json = Column(JSON, nullable=False)

    workspace_path = Column(String, nullable=False)

    total_runs = Column(Integer, nullable=False)
    completed_runs = Column(Integer, default=0)

    status = Column(SAEnum(ExperimentStatus), nullable=False)

    access_token_hash = Column(String, nullable=False)

    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    runs = relationship(
        "Run",
        backref="experiment",
        cascade="all, delete-orphan"
    )