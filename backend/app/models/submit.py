from sqlalchemy import Column, String, DateTime, ForeignKey
from datetime import datetime, timezone
from app.core.database import Base

class Submit(Base):
    __tablename__ = "submit"

    id = Column(String, primary_key=True)
    dataset_id = Column(String, ForeignKey("dataset.id"), nullable=False)
    email = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
