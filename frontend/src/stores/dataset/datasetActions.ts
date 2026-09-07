import { v4 as uuid4 } from 'uuid';
import {
  uploadViaTus,
  updateDatasetName as updateDatasetNameApi,
  getDatasetStatus,
  downloadSampleDatasets as downloadSampleDatasetsApi,
  getDownloadProgress,
} from '@/services/uploadService';
import { validateDatasetExistence } from '@/services/uploadService';
import { DatasetItem } from '@/types';
import { DatasetUploadStatus, DatasetExtractionStatus, DownloadPhase } from '@/types';
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
      const uploading = current.filter((item) => item.status === DatasetUploadStatus.UPLOADING).length;
      const pending = current.filter((item) => item.status === DatasetUploadStatus.PENDING);

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
        (item) => item.status === DatasetUploadStatus.PENDING || item.status === DatasetUploadStatus.UPLOADING
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
        (item) => item.status === DatasetUploadStatus.PENDING || item.status === DatasetUploadStatus.UPLOADING
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
        ? { ...d, status: DatasetUploadStatus.UPLOADING, uploadProgress: 0, error: undefined }
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
              status: DatasetUploadStatus.PROCESSING,
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
              status: DatasetUploadStatus.ERROR,
              uploadProgress: 0,
              error: err instanceof Error ? err.message : 'Upload failed',
            }
          : d
      ),
    }));
  }

   // Try to start next pending item
   const current = get().datasets;
   const uploadingCount = current.filter((d) => d.status === DatasetUploadStatus.UPLOADING).length;
   if (uploadingCount < CONCURRENT_LIMIT) {
     const nextPending = current.find((d) => d.status === DatasetUploadStatus.PENDING);
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
                    status: statusData.status === DatasetExtractionStatus.READY
                      ? DatasetUploadStatus.SUCCESS
                      : statusData.status === DatasetExtractionStatus.FAILED
                        ? DatasetUploadStatus.ERROR
                        : d.status,
                    error: statusData.error || d.error,
                  }
                : d
          ),
          }));

          if (statusData.status === DatasetExtractionStatus.READY || statusData.status === DatasetExtractionStatus.FAILED) {
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
 * Poll a sample dataset download until it's handed off to extraction,
 * then poll the dataset status until ready or failed.
 */
async function pollSampleDownload(
  itemId: string,
  datasetId: string,
  taskId: string,
  get: () => DatasetStore,
  set: (partial: Partial<DatasetStoreState> | ((prev: DatasetStoreState) => Partial<DatasetStoreState>)) => void,
) {
  const intervalMs = 2000;

  // Phase 1: Poll download progress until handed_off or failed
  await new Promise<void>((resolve) => {
    const timer = setInterval(async () => {
      try {
        const progress = await getDownloadProgress(datasetId, taskId);

        set((prev) => ({
          datasets: prev.datasets.map((d) =>
            d.id === itemId
              ? {
                  ...d,
                  uploadProgress: progress.percent ?? d.uploadProgress,
                  error: progress.error || d.error,
                }
              : d
          ),
        }));

        if (progress.phase === DownloadPhase.HANDED_OFF) {
          clearInterval(timer);
          set((prev) => ({
            datasets: prev.datasets.map((d) =>
              d.id === itemId
                ? { ...d, status: DatasetUploadStatus.PROCESSING, uploadProgress: 100 }
                : d
            ),
          }));
          resolve();
        } else if (progress.phase === DownloadPhase.FAILED) {
          clearInterval(timer);
          set((prev) => ({
            datasets: prev.datasets.map((d) =>
              d.id === itemId
                ? { ...d, status: DatasetUploadStatus.ERROR, error: progress.error || 'Download failed' }
                : d
            ),
          }));
          resolve();
        }
      } catch {
        // ignore transient poll errors
      }
    }, intervalMs);
  });

  // Phase 2: Poll dataset status until ready or failed
  await pollDatasetStatus(itemId, datasetId, get, set);
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
    .filter((d) => d.status === DatasetUploadStatus.SUCCESS && d.datasetId !== null)
    .map((d) => d.datasetId as string);

  if (currentIds.length === 0) return true;

  try {
    const validIds = await validateDatasetExistence(currentIds);

    set((prev) => ({
      datasets: prev.datasets.filter(
        (d) => !(d.status === DatasetUploadStatus.SUCCESS && d.datasetId && !validIds.includes(d.datasetId))
      ),
    }));

    const survivingCount = get().datasets.filter(
      (d) => d.status === DatasetUploadStatus.SUCCESS && d.datasetId !== null
    ).length;
    const lostCount = currentIds.length - survivingCount;

    if (lostCount > 0 && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(
        `${lostCount} of your uploaded datasets have expired and been removed from the server. Your workspace has been updated to keep your remaining valid files.`
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
      status: DatasetUploadStatus.PENDING,
    }));

    set((prev) => ({
      datasets: [...prev.datasets, ...newItems],
    }));
  },

  retryUpload: (queueItemId: string) => {
    set((prev) => ({
      datasets: prev.datasets.map((item) =>
        item.id === queueItemId
          ? { ...item, status: DatasetUploadStatus.PENDING, uploadProgress: 0, error: undefined, datasetId: null }
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

    set((prev) => ({
      datasets: prev.datasets.filter(
        (item) => item.datasetId !== idOrDatasetId && item.id !== idOrDatasetId
      ),
    }));
  },

  validateDatasetsWithBackend: () => validateDatasetsWithBackend(get, set),

  isDatasetReady: () => {
    return get().datasets.some((d) => d.status === DatasetUploadStatus.SUCCESS && d.datasetId !== null);
  },

  resetDatasetState: () => {
    set({
      datasets: [],
      isQueueProcessing: false,
      uploadId: null,
    });
  },

  downloadSampleDatasets: async (technology: string) => {
    try {
      const response = await downloadSampleDatasetsApi(technology);

      const newItems: DatasetItem[] = response.downloads.map((d) => ({
        id: uuid4(),
        fileName: d.dataset_name,
        datasetName: d.dataset_name,
        datasetId: d.dataset_id,
        taskId: d.task_id,
        size: 0,
        uploadProgress: 0,
        status: DatasetUploadStatus.DOWNLOADING,
      }));

      set((prev) => ({
        datasets: [...prev.datasets, ...newItems],
      }));

      // Poll each download in parallel until handed_off, then poll status until ready/failed
      await Promise.all(
        newItems.map((item) =>
          pollSampleDownload(item.id, item.datasetId!, item.taskId!, get, set)
        )
      );
    } catch (err) {
      console.error('Failed to download sample datasets:', err);
    }
  },
});