import { DatasetItem } from '@/types';

export type DatasetStoreState = {
  datasets: DatasetItem[];
  isQueueProcessing: boolean;
  uploadId: string | null;
};

export interface DatasetStoreActions {
  uploadDataset: (files: File[]) => void;
  retryUpload: (queueItemId: string) => void;
  updateDatasetName: (datasetId: string, datasetName: string) => void;
  removeUploadedDataset: (idOrDatasetId: string) => void;
  saveUploadedDataset: (dataset: DatasetItem) => void;
  updateUploadedDatasetName: (datasetId: string, datasetName: string) => void;
  removeDatasetById: (datasetId: string) => void;
  validateDatasetsWithBackend: () => Promise<boolean>;
  isDatasetReady: () => boolean;
  resetDatasetState: () => void;
}

export type DatasetStore = DatasetStoreState & DatasetStoreActions;