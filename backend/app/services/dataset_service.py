from sqlalchemy.orm import Session
from app.models.dataset import Dataset
from uuid import uuid4
from pathlib import Path

def create_dataset(db: Session, zip_path: Path) -> Dataset:
    dataset = Dataset(
        id=f"ds_{uuid4().hex[:8]}",
        zip_path=str(zip_path),
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset
