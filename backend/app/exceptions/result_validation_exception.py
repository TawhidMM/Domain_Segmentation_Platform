from app.schemas.result_validation import ValidationErrorType


class ResultValidationException(Exception):
    def __init__(self, error_type: ValidationErrorType, message: str):
        super().__init__(message)
        self.error_type = error_type
        self.message = message


class MissingFilesException(ResultValidationException):
    def __init__(self, message: str):
        super().__init__(ValidationErrorType.MISSING_FILES, message)

class FileShapeMismatchException(ResultValidationException):
    def __init__(self, message: str):
        super().__init__(ValidationErrorType.FILE_SHAPE_MISMATCH, message)

class BarcodeAlignmentException(ResultValidationException):
    def __init__(self, message: str):
        super().__init__(ValidationErrorType.BARCODE_ALIGNMENT_FAILURE, message)

class SchemaViolationException(ResultValidationException):
    def __init__(self, message: str):
        super().__init__(ValidationErrorType.SCHEMA_VIOLATION, message)

class InvalidDataTypesException(ResultValidationException):
    def __init__(self, message: str):
        super().__init__(ValidationErrorType.INVALID_DATA_TYPES, message)