from sqlalchemy import Column, String, ForeignKey, Integer, JSON, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.experiment import ExperimentStatus


class Run(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True)

    experiment_id = Column(
        String,
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False
    )

    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id"),
        nullable=False
    )

    seed = Column(Integer, nullable=False)

    status = Column(SAEnum(ExperimentStatus), nullable=False)

    output_path = Column(String, nullable=False)
    metrics_json = Column(JSON, nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    dataset = relationship("Dataset")