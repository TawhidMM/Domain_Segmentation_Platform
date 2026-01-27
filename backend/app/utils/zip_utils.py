import zipfile
import shutil

def save_and_extract_zip(upload_file, zip_path: str, extract_path: str):
    # Save ZIP
    with open(zip_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    # Extract ZIP
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_path)
