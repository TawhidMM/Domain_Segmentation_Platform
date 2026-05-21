import abc
from pathlib import Path

from app.core.config import settings


class UploadSpace(abc.ABC):
    def __init__(self, relative_sub_path: Path):
        self._relative_sub_path = relative_sub_path

    @property
    def internal_root(self) -> Path:
        return settings.INTERNAL_UPLOAD_ROOT / self._relative_sub_path

    @property
    def host_root(self) -> Path:
        return settings.HOST_UPLOADS_ROOT / self._relative_sub_path


class StagingSpace(UploadSpace):

    _DIR_NAME = Path("staged_results")

    @classmethod
    def base_directory(cls) -> Path:
        return settings.INTERNAL_UPLOAD_ROOT / cls._DIR_NAME

    def __init__(self, stage_id: str):
        self.stage_id = stage_id

        super().__init__(self._DIR_NAME / stage_id)

    @property
    def staging_directory(self) -> Path:
        return self.internal_root


class DatasetSpace(UploadSpace):
    _DIR_NAME = Path("datasets")
    _EXTRACTED_DIR = "extracted"
    _ANNOTATIONS_DIR = "annotations"

    @classmethod
    def base_directory(cls) -> Path:
        return settings.INTERNAL_UPLOAD_ROOT / cls._DIR_NAME

    def __init__(self, dataset_id: str):
        self.dataset_id = dataset_id
        super().__init__(self._DIR_NAME / dataset_id)

    @property
    def upload_directory(self) -> Path:
        return self.internal_root

    @property
    def dataset_path(self) -> Path:
        return self.internal_root / self._EXTRACTED_DIR

    @property
    def host_dataset_path(self) -> Path:
        return self.host_root / self._EXTRACTED_DIR

    def annotation_file_path(self, annotation_id: str) -> Path:
        return self.internal_root / self._ANNOTATIONS_DIR / self._annotation_file_name(annotation_id)

    def host_annotation_file_path(self, annotation_id: str) -> Path:
        return self.host_root / self._ANNOTATIONS_DIR / self._annotation_file_name(annotation_id)

    @staticmethod
    def _annotation_file_name(annotation_id: str) -> str:
        return f"{annotation_id}.json"

