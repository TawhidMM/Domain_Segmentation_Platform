def has_header_row(first_row: list[str] | None) -> bool:
    """Check if the first row of a CSV is a header row.

    Space Ranger v2+ tissue_positions.csv files start with a 'barcode' header
    column, while v1 tissue_positions_list.csv files start directly with data.
    Returns True if the first column (case-insensitive) equals 'barcode'.
    """
    if not first_row:
        return False
    return first_row[0].strip().lower() == "barcode"
