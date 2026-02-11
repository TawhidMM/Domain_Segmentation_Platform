from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "dataset"

    id = Column(String, primary_key=True)
    upload_id = Column(String, unique=True, nullable=False)
    zip_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)