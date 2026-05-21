import shutil
from pathlib import Path


class LocalStorage:
    @staticmethod
    def save_chunk(path: Path, chunk: bytes):
        with open(path, "ab") as f:
            f.write(chunk)

    @staticmethod
    def read(path: Path):
        return open(path, "rb")

    @staticmethod
    def delete(path: Path):

        if not path.exists():
            return

        try:
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
            return
        except Exception as e:
            raise e


storage = LocalStorage()
