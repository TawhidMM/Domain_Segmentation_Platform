from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from datetime import datetime, timezone
from app.core.database import Base


class DatasetExtractionStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class DatasetTechnology(str, Enum):
    VISIUM = "visium"


class Dataset(Base):
    __tablename__ = "datasets"

    dataset_id = Column(String, primary_key=True)
    dataset_name = Column(String, nullable=True)
    zip_path = Column(String, nullable=False)
    technology = Column(SAEnum(DatasetTechnology), nullable=False, default=DatasetTechnology.VISIUM)
    status = Column(SAEnum(DatasetExtractionStatus), nullable=False, default=DatasetExtractionStatus.PROCESSING)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
