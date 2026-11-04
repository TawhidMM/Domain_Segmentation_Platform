from pathlib import Path

from app.dataset.spatial_dataset import SpatialDataReader
from app.dataset.visium import VisiumDataReader
from app.models.dataset import DatasetTechnology

_REGISTRY: dict[DatasetTechnology, type[SpatialDataReader]] = {
    DatasetTechnology.VISIUM: VisiumDataReader,
}


def get_data_reader(technology: DatasetTechnology, dataset_dir: Path) -> SpatialDataReader:
    cls = _REGISTRY.get(technology)
    if cls is None:
        raise ValueError(f"Unsupported dataset technology: {technology}")
    return cls(dataset_dir)


__all__ = ["SpatialDataReader", "VisiumDataReader", "DatasetTechnology", "get_data_reader"]