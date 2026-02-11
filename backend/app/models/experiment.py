from sqlalchemy import Column, String, DateTime, ForeignKey, JSON

from app.core.database import Base


class Experiment(Base):
    __tablename__ = "experiment"

    id = Column(String, primary_key=True)

    dataset_id = Column(String, ForeignKey("dataset.id"), nullable=False)

    tool_name = Column(String, nullable=False)
    params_json = Column(JSON, nullable=False)

    workspace_path = Column(String, nullable=False)

    status = Column(String, nullable=False)

    access_token_hash = Column(String, nullable=False)

    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))

