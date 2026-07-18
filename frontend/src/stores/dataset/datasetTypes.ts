import { DatasetUploadQueueItem } from '@/types';
import type { AxiosInstance } from 'axios';

export interface UploadedDataset {
  id: string;
  datasetId: string | null;
  fileName: string;
  datasetName: string;
  size: number;
  uploadProgress: number;
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
  error?: string;
}

export interface DatasetStoreState {
  // Internal state (not persisted)
  uploadQueue: DatasetUploadQueueItem[];
  isQueueProcessing: boolean;

  // Persisted state (survives browser refresh)
  uploadId: string | null;
  uploadedDatasets: UploadedDataset[];
}

export interface DatasetStoreActions {
  uploadDataset: (files: File[]) => void;
  retryUpload: (queueItemId: string) => void;
  updateDatasetName: (datasetId: string, datasetName: string) => void;
  removeUploadedDataset: (datasetId: string) => void;
  saveUploadedDataset: (uploadedDataset: UploadedDataset) => void;
  updateUploadedDatasetName: (datasetId: string, datasetName: string) => void;
  removeDatasetById: (datasetId: string) => void;
  validateDatasetsWithBackend: () => Promise<boolean>;
  isDatasetReady: () => boolean;
  uploadSpatialCoordinates: (file: File) => void;
  uploadTissueImage: (file: File) => void;
  resetDatasetState: () => void;
}

export type DatasetStore = DatasetStoreState & DatasetStoreActions;