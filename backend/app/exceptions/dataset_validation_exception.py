class DatasetValidationError(Exception):
    """Raised for deterministic, non-retryable extraction/validation failures."""
    pass