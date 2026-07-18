import { v4 as uuid4 } from 'uuid';
import { uploadStDataset, updateDatasetName as updateDatasetNameApi } from '@/services/uploadService';
import { validateDatasetExistence } from '@/services/uploadService';
import { DatasetUploadQueueItem } from '@/types';
import type { DatasetStore, DatasetStoreState } from './datasetTypes';

/**
 * Get a human-readable dataset name from a file name.
 * Strips the file extension and trims whitespace.
 */
const getDatasetNameFromFile = (fileName: string): string => {
  const stripped = fileName.replace(/\.[^/.]+$/, '').trim();
  return stripped || fileName;
};

/**
 * Process the upload queue sequentially.
 * Internal function — not exposed to components.
 */
export const processUploadQueue = async (
  get: () => DatasetStore,
  set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
): Promise<void> => {
  const state = get();
  if (state.isQueueProcessing) return;

  set({ isQueueProcessing: true });

  try {
    let queue = get().uploadQueue;
    while (queue.some((item) => item.status === 'PENDING')) {
      const nextItem = queue.find((item) => item.status === 'PENDING');
      if (!nextItem) break;

      // Mark as UPLOADING
      set((prev) => ({
        uploadQueue: prev.uploadQueue.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: 'UPLOADING' as const, uploadProgress: 0, error: undefined }
            : item
        ),
      }));

      try {
        const datasetName = nextItem.datasetName?.trim() || getDatasetNameFromFile(nextItem.fileName);
        const datasetId = await uploadStDataset(
          nextItem.file, 
          datasetName, 
            (progress) => {
            set((prev) => ({
              uploadQueue: prev.uploadQueue.map((item) =>
                item.id === nextItem.id ? { ...item, uploadProgress: progress } : item
              ),
            }));
        });

        // Build the persisted entry
        const savedEntry = {
          id: nextItem.id,
          datasetId,
          fileName: nextItem.fileName,
          datasetName,
          size: nextItem.size,
          uploadProgress: 100,
          status: 'SUCCESS' as const,
          error: undefined as string | undefined,
        };

        set((prev) => ({
          uploadId: datasetId,
          uploadQueue: prev.uploadQueue.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  datasetId,
                  datasetName,
                  status: 'SUCCESS' as const,
                  uploadProgress: 100,
                }
              : item
          ),
          uploadedDatasets: [...prev.uploadedDatasets, savedEntry],
        }));
      } catch (err) {
        console.error(`Upload failed for ${nextItem.fileName}:`, err);
        set((prev) => ({
          uploadQueue: prev.uploadQueue.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'ERROR' as const,
                  uploadProgress: 0,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : item
          ),
        }));
      }

      queue = get().uploadQueue;
    }
  } finally {
    set({ isQueueProcessing: false });
  }
};

/**
 * Validate persisted datasets against the backend.
 */
export const validateDatasetsWithBackend = async (
  get: () => DatasetStore,
  set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
): Promise<boolean> => {
  const { uploadedDatasets } = get();
  const currentIds = uploadedDatasets
    .map((d) => d.datasetId)
    .filter((id): id is string => id !== null);

  if (currentIds.length === 0) return true;

  try {
    const validIds = await validateDatasetExistence(currentIds);

    const survivingDatasets = uploadedDatasets.filter(
      (dataset) => dataset.datasetId === null || validIds.includes(dataset.datasetId)
    );

    const lostCount = uploadedDatasets.length - survivingDatasets.length;

    if (lostCount > 0) {
      set({ uploadedDatasets: survivingDatasets });

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(
          `${lostCount} of your cached datasets have expired and been removed from the server. Your workspace has been updated to keep your remaining valid files.`
        );
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to validate workspace datasets:', error);
    set({ uploadedDatasets: [] });

    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Unable to sync your session with the server. Resetting workspace to avoid corrupt data entries.');
    }
    return false;
  }
};

/**
 * Create the initial set of actions for the dataset store.
 */
export const createDatasetActions = (
  set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
  get: () => DatasetStore,
): Record<string, (...args: any[]) => void> => ({
  uploadDataset: (files: File[]) => {
    if (!files.length) return;

    const queueItems: DatasetUploadQueueItem[] = files.map((file) => ({
      id: uuid4(),
      file,
      fileName: file.name,
      datasetName: getDatasetNameFromFile(file.name),
      datasetId: null,
      size: file.size,
      uploadProgress: 0,
      status: 'PENDING',
    }));

    set((prev) => ({
      uploadQueue: [...prev.uploadQueue, ...queueItems],
    }));
  },

  retryUpload: (queueItemId: string) => {
    set((prev) => ({
      uploadQueue: prev.uploadQueue.map((item) =>
        item.id === queueItemId
          ? { ...item, status: 'PENDING' as const, uploadProgress: 0, error: undefined, datasetId: null }
          : item
      ),
    }));
  },

  updateDatasetName: async (datasetId: string, datasetName: string) => {
    if (!datasetId) return;
    const normalizedName = datasetName.trim();
    if (!normalizedName) return;

    try {
      await updateDatasetNameApi(datasetId, normalizedName);
      set((prev) => ({
        uploadQueue: prev.uploadQueue.map((item) =>
          item.datasetId === datasetId ? { ...item, datasetName: normalizedName } : item
        ),
        uploadedDatasets: prev.uploadedDatasets.map((item) =>
          item.datasetId === datasetId ? { ...item, datasetName: normalizedName } : item
        ),
      }));
    } catch (err) {
      console.error(`Failed to update dataset name for ${datasetId}:`, err);
    }
  },

  saveUploadedDataset: (uploadedDataset) => {
    set((state) => {
      const next = state.uploadedDatasets.filter((item) => item.datasetId !== uploadedDataset.datasetId);
      return { uploadedDatasets: [...next, uploadedDataset] };
    });
  },

  updateUploadedDatasetName: (datasetId: string, datasetName: string) => {
    set((state) => ({
      uploadedDatasets: state.uploadedDatasets.map((item) =>
        item.datasetId === datasetId ? { ...item, datasetName } : item
      ),
    }));
  },

  removeDatasetById: (datasetId: string) => {
    set((state) => ({
      uploadedDatasets: state.uploadedDatasets.filter((item) => item.datasetId !== datasetId),
    }));
  },

  validateDatasets: () => validateDatasetsWithBackend(get, set),

  isDatasetReady: () => {
    return get().uploadedDatasets.length > 0;
  },

  removeUploadedDataset: (datasetId: string) => {
    set((prev) => ({
      uploadQueue: prev.uploadQueue.filter(
        (item) => item.datasetId !== datasetId && item.id !== datasetId
      ),
      uploadedDatasets: prev.uploadedDatasets.filter(
        (item) => item.datasetId !== datasetId
      ),
    }));
  },

  resetDatasetState: () => {
    set({
      uploadQueue: [],
      isQueueProcessing: false,
      uploadId: null,
      uploadedDatasets: [],
    });
  },
});