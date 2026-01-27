from pathlib import Path
import json

# Create a path object
file_path = Path("/mnt/Drive E/Class Notes/L-4 T-2/Project/backend/experiments/exp_20260122_130259_22c7/outputs/frontend_result.json")

# Read the text FROM the file, then load it
data = json.loads(file_path.read_text())

print(f"JSON Length: {len(data["spots"])}")