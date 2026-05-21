import csv
import shutil
from pathlib import Path
from app.core.redis import redis_client, RESULT_VALIDATION_SESSION_TTL, get_result_validation_key

from app.core.config import settings
from app.core.workspace import DatasetSpace
from app.exceptions.result_validation_exception import ResultValidationException, MissingFilesException, \
    FileShapeMismatchException, BarcodeAlignmentException, SchemaViolationException, InvalidDataTypesException
from app.schemas.result_validation import ValidationPayload, ValidationStatus, ValidationErrorType


def validate_result_bundle(
    stage_id: str,
    dataset_id: str,
    result_directory: Path
) -> None:

    redis_key = get_result_validation_key(stage_id)

    try:
        _verify_structure(result_directory)
        _validate_csv_schemas(result_directory, dataset_id)

        payload = ValidationPayload(
            status=ValidationStatus.SUCCESS,
            message="All data integrity requirements verified successfully."
        )
        redis_client.setex(redis_key, RESULT_VALIDATION_SESSION_TTL, payload.convert_to_json())

    except ResultValidationException as e:
        payload = ValidationPayload(
            status=ValidationStatus.FAILED,
            error_type=e.error_type,
            message=e.message
        )
        redis_client.setex(redis_key, RESULT_VALIDATION_SESSION_TTL, payload.convert_to_json())

        if result_directory.exists():
            shutil.rmtree(result_directory)

    except Exception as e:
        payload = ValidationPayload(
            status=ValidationStatus.FAILED,
            error_type=ValidationErrorType.INTERNAL_SYSTEM_ERROR,
            message=str(e)
        )
        redis_client.setex(redis_key, RESULT_VALIDATION_SESSION_TTL, payload.convert_to_json())

        if result_directory.exists():
            shutil.rmtree(result_directory)


def _verify_structure(
    result_directory: Path
) -> None:

    REQUIRED_FILES = {settings.PREDICTIONS_CSV, settings.EMBEDDINGS_CSV}

    extracted_files = {p.name for p in result_directory.iterdir() if p.is_file()}
    missing = REQUIRED_FILES - extracted_files

    if missing:
        raise MissingFilesException(f"Invalid result bundle. Missing required files: {', '.join(missing)}")


def _validate_csv_schemas(
    result_directory: Path,
    dataset_id: str
) -> None:

    pred_path = result_directory / settings.PREDICTIONS_CSV
    embed_path = result_directory / settings.EMBEDDINGS_CSV

    prediction_barcodes = _validate_prediction_file(pred_path)
    embedding_barcodes = _validate_embedding_file(embed_path)

    # Cross-verify the files against each other
    if len(prediction_barcodes) != len(embedding_barcodes):
        raise FileShapeMismatchException(
            f"File mismatch error. predictions.csv contains {len(prediction_barcodes)} spots, "
            f"but embeddings.csv contains {len(embedding_barcodes)} spots. They must be identical."
        )

    # Check for symmetric identity set differences
    mismatched_barcodes = prediction_barcodes ^ embedding_barcodes
    if mismatched_barcodes:
        # Grab a sample barcode to show in the error message
        sample = list(mismatched_barcodes)[0]
        raise BarcodeAlignmentException(
            f"Barcode sync error. The spot barcodes in your prediction file do not align "
            f"with the barcodes in your embedding file. Example mismatch: '{sample}'."
        )

    _dataset_cross_validation(prediction_barcodes, dataset_id)



def _validate_prediction_file(
    pred_path: Path
) -> set[str]:

    seen_barcodes = set()

    with open(pred_path, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)

        if not header or len(header) < 2:
            raise SchemaViolationException("predictions.csv must have at least 2 columns: (barcode, domain).")

        for row_idx, row in enumerate(reader, start=2):
            if not row:
                continue

            if len(row) < 2:
                raise SchemaViolationException(
                    f"predictions.csv: Malformed data row at line {row_idx}. Expected 2 columns, got {len(row)}."
                )

            barcode = row[0].strip()
            domain_str = row[1].strip()

            # 1. Verify Barcode isn't empty
            if not barcode:
                raise InvalidDataTypesException(f"predictions.csv: Missing barcode value at line {row_idx}.")
            # 2. Prevent duplicate entries
            if barcode in seen_barcodes:
                raise InvalidDataTypesException(f"predictions.csv: Duplicate barcode detected at line {row_idx}: '{barcode}'.")

            # 3. Enforce Integer domain values
            try:
                int(domain_str)
            except ValueError:
                raise InvalidDataTypesException(
                    f"predictions.csv: Invalid domain category '{domain_str}' at line {row_idx}. Must be an integer.")

            seen_barcodes.add(barcode)

    if not seen_barcodes:
        raise InvalidDataTypesException("predictions.csv contains no valid data rows.")

    return seen_barcodes


def _validate_embedding_file(
    embed_path: Path
) -> set[str]:

    seen_barcodes = set()
    expected_dimensions = None

    with open(embed_path, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)

        if not header or len(header) < 3:
            raise SchemaViolationException(
                "embeddings.csv must contain a barcode column and at least 2 embedding feature dimensions.")

        for row_idx, row in enumerate(reader, start=2):
            if not row:
                continue

            # 1. Enforce a strict matrix layout shape across all lines
            if expected_dimensions is None:
                expected_dimensions = len(row)
            elif len(row) != expected_dimensions:
                raise SchemaViolationException(
                    f"embeddings.csv: Inconsistent dimension count at line {row_idx}. "
                    f"Expected {expected_dimensions} columns, but found {len(row)}."
                )

            barcode = row[0].strip()

            if not barcode:
                raise InvalidDataTypesException(f"embeddings.csv: Missing barcode value at line {row_idx}.")
            if barcode in seen_barcodes:
                raise InvalidDataTypesException(f"embeddings.csv: Duplicate barcode detected at line {row_idx}: '{barcode}'.")

            # 2. Enforce Floats across all embedding coordinate dimensions
            for col_idx, value in enumerate(row[1:], start=1):
                try:
                    float(value.strip())
                except ValueError:
                    raise InvalidDataTypesException(
                        f"embeddings.csv: Non-numeric embedding coordinate '{value}' "
                        f"detected at line {row_idx}, column {col_idx + 1}."
                    )

            seen_barcodes.add(barcode)

    if not seen_barcodes:
        raise InvalidDataTypesException("embeddings.csv contains no valid data rows.")

    return seen_barcodes



def _dataset_cross_validation(
    prediction_barcodes: set[str],
    dataset_id: str
):
    dataset_dir = DatasetSpace(dataset_id).dataset_path

    dataset_coords_file = dataset_dir / "spatial" / "tissue_positions_list.csv"

    if not dataset_coords_file.exists():
        raise BarcodeAlignmentException(
            f"Cross-validation aborted. Target dataset '{dataset_id}' "
            f"is missing its tissue reference coordinate files on the server."
        )

    # Parse valid reference biological barcodes from the system dataset
    valid_dataset_barcodes = set()
    with open(dataset_coords_file, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)

        for row_idx, row in enumerate(reader, start=1):
            if not row:
                continue

            first_val = row[0].strip()

            # If the first row contains structural column strings like "barcode",
            # skip it dynamically regardless of the files sourcing variant
            if row_idx == 1 and first_val.lower() in ("barcode", "id"):
                continue

            valid_dataset_barcodes.add(first_val)

    # Check if the user's uploaded barcodes exist in the real Visium dataset
    if not prediction_barcodes.issubset(valid_dataset_barcodes):
        # Find which uploaded barcodes are invalid variants
        mismatched_barcodes = prediction_barcodes - valid_dataset_barcodes
        sample_mismatched = list(mismatched_barcodes)[0]
        raise BarcodeAlignmentException(
            f"Dataset alignment failure. The barcodes in your uploaded result files do not "
            f"match the spatial spots of the selected dataset. Example mismatched spot: '{sample_mismatched}'."
        )