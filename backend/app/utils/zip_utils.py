import zipfile
import shutil

def extract_zip(zip_path: str, target_dir: str):
    temp_extract_path = target_dir / f"tmp"

    try:
        if temp_extract_path.exists():
            shutil.rmtree(temp_extract_path)

        temp_extract_path.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(temp_extract_path)

        items = [i for i in temp_extract_path.iterdir()]
        if len(items) == 1 and items[0].is_dir():
            content_root = items[0]
        else:
            content_root = temp_extract_path

        for item in content_root.iterdir():
            shutil.move(str(item), str(target_dir / item.name))

    finally:
        shutil.rmtree(temp_extract_path)
