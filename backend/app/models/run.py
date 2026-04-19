from sqlalchemy import Column, String, ForeignKey, Integer, JSON, DateTime, Enum as SAEnum

from app.core.database import Base
from app.models.experiment import ExperimentStatus


class Run(Base):
    """
    Simple execution pointer: only stores seed and results.
    Dataset and params are resolved through RunConfig.
    """
    __tablename__ = "runs"

    id = Column(String, primary_key=True)

    run_config_id = Column(
        String,
        ForeignKey("run_configs.id", ondelete="CASCADE"),
        nullable=False
    )

    seed = Column(Integer, nullable=False)

    status = Column(SAEnum(ExperimentStatus), nullable=False)

    output_path = Column(String, nullable=False)
    metrics_json = Column(JSON, nullable=True)

    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)