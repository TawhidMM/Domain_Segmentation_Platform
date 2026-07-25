import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DatasetItem } from '@/types';
import { createDatasetActions, processUploadQueue } from './datasetActions';
import type { DatasetStore, DatasetStoreState } from './datasetTypes';

const STORAGE_KEY = 'dataset-store-v1';

const initialState: DatasetStoreState = {
  datasets: [],
  isQueueProcessing: false,
  uploadId: null,
};

export const useDatasetStore = create<DatasetStore>()(
  persist(
    (set, get) => {
      const actions = createDatasetActions(set, get);

      // Trigger queue processing whenever the queue changes
      const originalUploadDataset = actions.uploadDataset;
      const wrappedUploadDataset = (files: File[]) => {
        originalUploadDataset(files);
        setTimeout(() => {
          void processUploadQueue(get, set);
        }, 0);
      };

      const originalRetryUpload = actions.retryUpload;
      const wrappedRetryUpload = (queueItemId: string) => {
        originalRetryUpload(queueItemId);
        setTimeout(() => {
          void processUploadQueue(get, set);
        }, 0);
      };

      return {
        ...initialState,
        uploadDataset: wrappedUploadDataset,
        retryUpload: wrappedRetryUpload,
        updateDatasetName: actions.updateDatasetName as DatasetStore['updateDatasetName'],
        removeUploadedDataset: actions.removeUploadedDataset as DatasetStore['removeUploadedDataset'],
        saveUploadedDataset: actions.saveUploadedDataset as DatasetStore['saveUploadedDataset'],
        updateUploadedDatasetName: actions.updateUploadedDatasetName as DatasetStore['updateUploadedDatasetName'],
        removeDatasetById: actions.removeDatasetById as DatasetStore['removeDatasetById'],
        validateDatasetsWithBackend: actions.validateDatasetsWithBackend as DatasetStore['validateDatasetsWithBackend'],
        isDatasetReady: actions.isDatasetReady as DatasetStore['isDatasetReady'],
        resetDatasetState: actions.resetDatasetState as DatasetStore['resetDatasetState'],
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        uploadId: state.uploadId,
        datasets: state.datasets.filter((d) => d.status === 'SUCCESS'),
      }),
    }
  )
);