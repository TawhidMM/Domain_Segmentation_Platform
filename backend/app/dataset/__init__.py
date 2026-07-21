from app.dataset.spatial_dataset import SpatialDataset
from app.dataset.visium import VisiumDataset
from app.models.dataset import DatasetTechnology

_REGISTRY: dict[DatasetTechnology, type[SpatialDataset]] = {
    DatasetTechnology.VISIUM: VisiumDataset,
}


def get_dataset(technology: DatasetTechnology) -> SpatialDataset:
    cls = _REGISTRY.get(technology)
    if cls is None:
        raise ValueError(f"Unsupported dataset technology: {technology}")
    return cls()


__all__ = ["SpatialDataset", "VisiumDataset", "DatasetTechnology", "get_dataset"]