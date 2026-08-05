from app.models.dataset import DatasetTechnology

SAMPLE_DATASETS: dict[DatasetTechnology, list[dict]] = {
    DatasetTechnology.VISIUM: [
        {
            "name": "DLPFC_151507",
            "url": "https://github.com/TawhidMM/Domain_Segmentation_Platform/releases/download/sample-data-v1/DLPFC_151507.zip",
        },
        {
            "name": "DLPFC_151508",
            "url": "https://github.com/TawhidMM/Domain_Segmentation_Platform/releases/download/sample-data-v1/DLPFC_151508.zip",
        },
    ],
}