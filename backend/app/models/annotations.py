import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, TIMESTAMP, ForeignKey

from app.core.database import Base


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    dataset_id = Column(
        String,
        ForeignKey("datasets.dataset_id", ondelete="CASCADE"),
        nullable=False
    )

    file_path = Column(Text, nullable=False)

    created_at = Column(TIMESTAMP, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(TIMESTAMP, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
