from enum import Enum
from typing import Optional
from pydantic import BaseModel

class ValidationStatus(str, Enum):
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"

class ValidationErrorType(str, Enum):
    MISSING_FILES = "MISSING_FILES"
    FILE_SHAPE_MISMATCH = "FILE_SHAPE_MISMATCH"
    BARCODE_ALIGNMENT_FAILURE = "BARCODE_ALIGNMENT_FAILURE"
    SCHEMA_VIOLATION = "SCHEMA_VIOLATION"
    INVALID_DATA_TYPES = "INVALID_DATA_TYPES"
    INTERNAL_SYSTEM_ERROR = "INTERNAL_SYSTEM_ERROR"

class ValidationPayload(BaseModel):
    status: ValidationStatus
    message: str
    error_type: Optional[ValidationErrorType] = None

    def convert_to_json(self) -> str:
        return self.model_dump_json(exclude_none=True)