import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DatasetUploadQueueItem } from '@/types';
import { createDatasetActions, processUploadQueue } from './datasetActions';
import type { DatasetStore, DatasetStoreState } from './datasetTypes';

const STORAGE_KEY = 'dataset-store-v1';

const initialState: DatasetStoreState = {
  uploadQueue: [],
  isQueueProcessing: false,
  summary: null,
  uploadId: null,
  uploadedDatasets: [],
};

export const useDatasetStore = create<DatasetStore>()(
  persist(
    (set, get) => {
      const actions = createDatasetActions(set, get);

      // Trigger queue processing whenever the queue changes
      const originalUploadDataset = actions.uploadDataset;
      const wrappedUploadDataset = (files: File[]) => {
        originalUploadDataset(files);
        // Queue processing will be triggered by the effect below
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
        // Override actions with wrapped versions
        uploadDataset: wrappedUploadDataset,
        retryUpload: wrappedRetryUpload,
        updateDatasetName: actions.updateDatasetName as DatasetStore['updateDatasetName'],
        removeUploadedDataset: actions.removeUploadedDataset as DatasetStore['removeUploadedDataset'],
        saveUploadedDataset: actions.saveUploadedDataset as DatasetStore['saveUploadedDataset'],
        updateUploadedDatasetName: actions.updateUploadedDatasetName as DatasetStore['updateUploadedDatasetName'],
        removeDatasetById: actions.removeDatasetById as DatasetStore['removeDatasetById'],
        validateDatasetsWithBackend: actions.validateDatasetsWithBackend as DatasetStore['validateDatasetsWithBackend'],
        isDatasetReady: actions.isDatasetReady as DatasetStore['isDatasetReady'],
        uploadSpatialCoordinates: actions.uploadSpatialCoordinates as DatasetStore['uploadSpatialCoordinates'],
        uploadTissueImage: actions.uploadTissueImage as DatasetStore['uploadTissueImage'],
        resetDatasetState: actions.resetDatasetState as DatasetStore['resetDatasetState'],
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        summary: state.summary,
        uploadId: state.uploadId,
        uploadedDatasets: state.uploadedDatasets,
      }),
    }
  )
);