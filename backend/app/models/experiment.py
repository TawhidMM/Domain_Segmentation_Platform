from enum import Enum

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Enum as SAEnum

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
    dataset_id = Column(String, ForeignKey("datasets.dataset_id"), nullable=False)
    tool_name = Column(String, nullable=False)
    params_json = Column(JSON, nullable=False)
    workspace_path = Column(String, nullable=False)
    status = Column(SAEnum(ExperimentStatus), nullable=False)
    access_token_hash = Column(String, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
