from enum import Enum
from typing import Optional


class RunErrorCode(str, Enum):
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND"
    DATASET_NOT_FOUND = "DATASET_NOT_FOUND"
    CONFIG_PREPARATION_FAILED = "CONFIG_PREPARATION_FAILED"
    CONTAINER_START_FAILED = "CONTAINER_START_FAILED"
    CONTAINER_KILLED = "CONTAINER_KILLED"
    TOOL_FAILED = "TOOL_FAILED"
    OUTPUT_MISSING = "OUTPUT_MISSING"
    POST_PROCESSING_FAILED = "POST_PROCESSING_FAILED"
    UNKNOWN = "UNKNOWN"


class RunExecutionError(Exception):
    def __init__(
        self,
        code: RunErrorCode,
        message: str,
        exit_code: Optional[int] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.exit_code = exit_code


class DockerExecutionError(Exception):
    def __init__(self, message: str, return_code: int | None = None):
        super().__init__(message)
        self.return_code = return_code
