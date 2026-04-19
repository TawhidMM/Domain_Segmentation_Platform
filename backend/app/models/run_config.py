from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class RunConfig(Base):
    
    __tablename__ = "run_configs"

    id = Column(String, primary_key=True)

    experiment_id = Column(
        String,
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
    )

    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id"),
        nullable=False,
    )

    params_json = Column(JSON, nullable=False)

    runs = relationship(
        "Run",
        backref="run_config",
        cascade="all, delete-orphan",
    )
