"""
Utilities for exporting metrics to CSV format.
"""
import csv
from pathlib import Path
from typing import List, Dict, Any
from io import StringIO


def create_metrics_csv(rows: List[Dict[str, Any]], output_path: Path = None) -> str:
    """
    Create a CSV file from metrics data in tidy/long format.
    
    Args:
        rows: List of dictionaries with keys:
              - experiment_id: str
              - tool: str
              - run_id: str
              - metric: str
              - value: float
        output_path: Optional path to write CSV file to disk
    
    Returns:
        CSV content as string
    """
    if not rows:
        # Return empty CSV with header
        return "experiment_id,tool,run_id,metric,value\n"
    
    # Use StringIO to create in-memory CSV
    output = StringIO()
    
    fieldnames = ["experiment_id", "tool", "run_id", "metric", "value"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    writer.writerows(rows)
    
    csv_content = output.getvalue()
    output.close()
    
    # Optionally write to file
    if output_path:
        output_path.write_text(csv_content)
    
    return csv_content
