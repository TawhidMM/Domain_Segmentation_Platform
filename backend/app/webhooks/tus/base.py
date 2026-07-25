from abc import ABC, abstractmethod
from typing import Any


class TusUploadHandler(ABC):
    """One handler per upload_type. Mirrors the SpatialDataset registry
    pattern — each handler owns everything it needs to know about its
    upload type, instead of a shared dispatcher branching on strings."""

    upload_type: str

    @abstractmethod
    async def pre_create(self, event: dict[str, Any]) -> dict:
        ...

    @abstractmethod
    async def post_finish(self, event: dict[str, Any]) -> dict:
        ...