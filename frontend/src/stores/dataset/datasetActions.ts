import { v4 as uuid4 } from 'uuid';
import { uploadViaTus, updateDatasetName as updateDatasetNameApi, getDatasetStatus, deleteDataset } from '@/services/uploadService';
import { validateDatasetExistence } from '@/services/uploadService';
import { DatasetItem } from '@/types';
import type { DatasetStore, DatasetStoreState } from './datasetTypes';

/**
 * Get a human-readable dataset name from a file name.
 * Strips the file extension and trims whitespace.
 */
const getDatasetNameFromFile = (fileName: string): string => {
  const stripped = fileName.replace(/\.[^/.]+$/, '').trim();
  return stripped || fileName;
};

const CONCURRENT_LIMIT = 2;

/**
 * Process the upload queue sequentially with a concurrency cap.
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
    const startPending = () => {
      const current = get().datasets;
      const uploading = current.filter((item) => item.status === 'UPLOADING').length;
      const pending = current.filter((item) => item.status === 'PENDING');

      const slotsAvailable = Math.max(0, CONCURRENT_LIMIT - uploading);
      const toStart = pending.slice(0, slotsAvailable);

      for (const item of toStart) {
        uploadOne(item, get, set);
      }

      return toStart.length > 0 || uploading > 0;
    };

    // Kick off initial batch
    startPending();

    // Poll until all done — the uploadOne function updates state
    // and we re-check when state changes via the mutation callbacks.
    // Use a simple interval as a fallback watchdog.
    const interval = setInterval(() => {
      const current = get().datasets;
      const hasActive = current.some(
        (item) => item.status === 'PENDING' || item.status === 'UPLOADING'
      );
      if (!hasActive) {
        clearInterval(interval);
        set({ isQueueProcessing: false });
        return;
      }
      // Try to start any newly pending items
      startPending();
    }, 1000);

    // Cleanup on completion
    const unsubscribe = (get() as any).subscribe?.(() => {
      const current = get().datasets;
      const hasActive = current.some(
        (item) => item.status === 'PENDING' || item.status === 'UPLOADING'
      );
      if (!hasActive) {
        clearInterval(interval);
        set({ isQueueProcessing: false });
      }
    });

    if (unsubscribe) {
      const cleanup = () => clearInterval(interval);
      // We'll rely on the interval for cleanup
    }
  } finally {
    // Don't set false here — let the interval/completion handle it
  }
};

async function uploadOne(
  item: DatasetItem,
  get: () => DatasetStore,
  set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
) {
  if (!item.file) return;

  // Mark as UPLOADING
  set((prev) => ({
    datasets: prev.datasets.map((d) =>
      d.id === item.id
        ? { ...d, status: 'UPLOADING' as const, uploadProgress: 0, error: undefined }
        : d
    ),
  }));

  try {
    const datasetName = item.datasetName?.trim() || getDatasetNameFromFile(item.fileName);
    const datasetId = await uploadViaTus(item.file, datasetName, (progress) => {
      set((prev) => ({
        datasets: prev.datasets.map((d) =>
          d.id === item.id ? { ...d, uploadProgress: progress } : d
        ),
      }));
    });

    // Mark as PROCESSING — backend will extract asynchronously
    set((prev) => ({
      datasets: prev.datasets.map((d) =>
        d.id === item.id
          ? {
              ...d,
              datasetId,
              datasetName,
              status: 'PROCESSING' as const,
              uploadProgress: 100,
              error: undefined,
              file: undefined,
            }
          : d
      ),
    }));

    // Poll for completion
    await pollDatasetStatus(item.id, datasetId, get, set);
  } catch (err) {
    console.error(`Upload failed for ${item.fileName}:`, err);
    set((prev) => ({
      datasets: prev.datasets.map((d) =>
        d.id === item.id
          ? {
              ...d,
              status: 'ERROR' as const,
              uploadProgress: 0,
              error: err instanceof Error ? err.message : 'Upload failed',
            }
          : d
      ),
    }));
  }

   // Try to start next pending item
   const current = get().datasets;
   const uploadingCount = current.filter((d) => d.status === 'UPLOADING').length;
   if (uploadingCount < CONCURRENT_LIMIT) {
     const nextPending = current.find((d) => d.status === 'PENDING');
     if (nextPending) {
       uploadOne(nextPending, get, set);
     }
   }
 }


 async function pollDatasetStatus(
   itemId: string,
   datasetId: string,
   get: () => DatasetStore,
   set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
 ) {
   if (!datasetId) return;

    const intervalMs = 3000;

    return new Promise<void>((resolve) => {
      const timer = setInterval(async () => {
        try {
          const statusData = await getDatasetStatus(datasetId);

          set((prev) => ({
            datasets: prev.datasets.map((d) =>
              d.id === itemId
                ? {
                    ...d,
                    status: statusData.status === 'ready'
                      ? ('SUCCESS' as const)
                      : statusData.status === 'failed'
                        ? ('ERROR' as const)
                        : d.status,
                    error: statusData.error || d.error,
                  }
                : d
          ),
          }));

          if (statusData.status === 'ready' || statusData.status === 'failed') {
            clearInterval(timer);
            resolve();
          }
        } catch {
          // ignore transient poll errors
        }
      }, intervalMs);
    });
 }

/**
 * Validate persisted datasets against the backend.
 */
export const validateDatasetsWithBackend = async (
  get: () => DatasetStore,
  set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
): Promise<boolean> => {
  const { datasets } = get();
  const currentIds = datasets
    .filter((d) => d.status === 'SUCCESS' && d.datasetId !== null)
    .map((d) => d.datasetId as string);

  if (currentIds.length === 0) return true;

  try {
    const validIds = await validateDatasetExistence(currentIds);

    set((prev) => ({
      datasets: prev.datasets.map((d) => {
        if (d.status === 'SUCCESS' && d.datasetId && !validIds.includes(d.datasetId)) {
          // Remove expired datasets
          return { ...d, status: 'ERROR' as const, error: 'Dataset expired on server' };
        }
        return d;
      }),
    }));

    const survivingCount = get().datasets.filter(
      (d) => d.status === 'SUCCESS' && d.datasetId !== null
    ).length;
    const lostCount = currentIds.length - survivingCount;

    if (lostCount > 0 && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(
        `${lostCount} of your cached datasets have expired and been removed from the server. Your workspace has been updated to keep your remaining valid files.`
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to validate workspace datasets:', error);
    set({ datasets: [] });

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

    const newItems: DatasetItem[] = files.map((file) => ({
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
      datasets: [...prev.datasets, ...newItems],
    }));
  },

  retryUpload: (queueItemId: string) => {
    set((prev) => ({
      datasets: prev.datasets.map((item) =>
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
        datasets: prev.datasets.map((item) =>
          item.datasetId === datasetId || item.id === datasetId
            ? { ...item, datasetName: normalizedName }
            : item
        ),
      }));
    } catch (err) {
      console.error(`Failed to update dataset name for ${datasetId}:`, err);
    }
  },

  saveUploadedDataset: (dataset: DatasetItem) => {
    set((state) => {
      const next = state.datasets.filter((item) => item.id !== dataset.id);
      return { datasets: [...next, dataset] };
    });
  },

  updateUploadedDatasetName: (datasetId: string, datasetName: string) => {
    set((state) => ({
      datasets: state.datasets.map((item) =>
        item.datasetId === datasetId ? { ...item, datasetName } : item
      ),
    }));
  },

  removeDatasetById: (datasetId: string) => {
    set((state) => ({
      datasets: state.datasets.filter((item) => item.datasetId !== datasetId),
    }));
  },

  removeUploadedDataset: async (idOrDatasetId: string) => {
    const match = get().datasets.find(
      (item) => item.datasetId === idOrDatasetId || item.id === idOrDatasetId
    );
    const datasetId = match?.datasetId || (match?.id === idOrDatasetId ? null : idOrDatasetId);

    if (datasetId) {
      try {
        await deleteDataset(datasetId);
      } catch (err) {
        console.error(`Failed to delete dataset ${datasetId}:`, err);
        return;
      }
    }

    set((prev) => ({
      datasets: prev.datasets.filter(
        (item) => item.datasetId !== idOrDatasetId && item.id !== idOrDatasetId
      ),
    }));
  },

  validateDatasetsWithBackend: () => validateDatasetsWithBackend(get, set),

  isDatasetReady: () => {
    return get().datasets.some((d) => d.status === 'SUCCESS' && d.datasetId !== null);
  },

  resetDatasetState: () => {
    set({
      datasets: [],
      isQueueProcessing: false,
      uploadId: null,
    });
  },
});