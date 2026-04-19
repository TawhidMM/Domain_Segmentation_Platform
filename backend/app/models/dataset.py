from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    dataset_id = Column(String, primary_key=True)
    zip_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
