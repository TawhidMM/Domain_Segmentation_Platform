from pathlib import Path


class LocalStorage:
    def save_chunk(self, path: Path, chunk: bytes):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "ab") as f:
            f.write(chunk)

    def read(self, path: Path):
        return open(path, "rb")


storage = LocalStorage()
