import axiosInstance from '@/lib/axios';
import { UploadType } from '@/types/upload';
import { tusUpload } from '@/services/tusUpload';

export type ImportValidationStatus = 'processing' | 'success' | 'failed';

export type ImportValidationErrorType =
  | 'MISSING_FILES'
  | 'FILE_SHAPE_MISMATCH'
  | 'BARCODE_ALIGNMENT_FAILURE'
  | 'SCHEMA_VIOLATION'
  | 'INVALID_DATA_TYPES'
  | 'INTERNAL_SYSTEM_ERROR';

export interface ImportValidationPayload {
  status: ImportValidationStatus;
  message: string;
  error_type?: ImportValidationErrorType;
}

interface UploadProgressHandler {
  (progress: number): void;
}

interface UploadAndValidateOptions {
  onProgress?: UploadProgressHandler;
  onUploadComplete?: () => void;
  onValidationStart?: () => void;
}

export interface UploadAndValidateResult {
  stageId: string;
  validation: ImportValidationPayload;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ensureZipFile(file: File): void {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('Import results upload must be a .zip file.');
  }
}

export async function fetchImportResultStatus(stageId: string): Promise<ImportValidationPayload> {
  const response = await axiosInstance.get<ImportValidationPayload>(`/import/result/${stageId}/status`);
  return response.data;
}

export async function pollImportResultStatus(
  stageId: string,
  options?: {
    pollIntervalMs?: number;
    timeoutMs?: number;
  }
): Promise<ImportValidationPayload> {
  const pollIntervalMs = options?.pollIntervalMs ?? 3000;
  const timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const payload = await fetchImportResultStatus(stageId);

    if (payload.status !== 'processing') {
      return payload;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error('Timed out while waiting for import result validation.');
}

export async function checkStagedResultsValidity(stageIds: string[]): Promise<Record<string, boolean>> {
  const response = await axiosInstance.post<Record<string, boolean>>('/import/result/status', { stage_ids: stageIds });
  return response.data;
}

export async function uploadResultBundleViaTus(
  file: File,
  datasetId: string,
  options?: UploadAndValidateOptions
): Promise<UploadAndValidateResult> {
  ensureZipFile(file);

  const { promise } = tusUpload({
    file,
    metadata: {
      upload_type: UploadType.PRE_COMPUTED_RESULT,
      dataset_id: datasetId,
    },
    onProgress: options?.onProgress,
  });

  try {
    const stageId = await promise;

    options?.onUploadComplete?.();
    options?.onValidationStart?.();

    const validation = await pollImportResultStatus(stageId);
    return { stageId, validation };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to upload result bundle.');
  }
}