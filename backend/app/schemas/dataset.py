from enum import Enum
from dataclasses import dataclass
from pathlib import Path

class DatasetStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"

@dataclass
class Dataset:
    id: str
    zip_path: Path
    extract_path: Path
    status: DatasetStatus
