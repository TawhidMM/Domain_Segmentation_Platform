import axiosInstance from '@/lib/axios';

const CHUNK_SIZE = 50 * 1024 * 1024;

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

interface InitImportResponse {
  stage_id: string;
}

interface FinalizeImportResponse {
  stage_id: string;
  status: ImportValidationStatus;
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

export async function initializeResultUpload(totalChunks: number): Promise<string> {
  const formData = new FormData();
  formData.append('total_chunks', String(totalChunks));

  const response = await axiosInstance.post<InitImportResponse>('/import/result/init', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.stage_id;
}

export async function uploadResultChunk(stageId: string, chunk: Blob): Promise<void> {
  const formData = new FormData();
  formData.append('stage_id', stageId);
  formData.append('chunk', chunk, 'import-results.zip');

  await axiosInstance.post('/import/result/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function finalizeResultUpload(stageId: string, datasetId: string): Promise<FinalizeImportResponse> {
  const formData = new FormData();
  formData.append('stage_id', stageId);
  formData.append('dataset_id', datasetId);

  const response = await axiosInstance.post<FinalizeImportResponse>('/import/result/finalize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
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
  const pollIntervalMs = options?.pollIntervalMs ?? 1500;
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

export async function uploadResultBundle(
  file: File,
  datasetId: string,
  options?: UploadAndValidateOptions,
): Promise<UploadAndValidateResult> {
  ensureZipFile(file);

  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const stageId = await initializeResultUpload(totalChunks);

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end, file.type || 'application/zip');

    await uploadResultChunk(stageId, chunk);

    if (options?.onProgress) {
      options.onProgress(Math.round(((index + 1) / totalChunks) * 100));
    }
  }

  if (options?.onUploadComplete) {
    options.onUploadComplete();
  }

  await finalizeResultUpload(stageId, datasetId);

  if (options?.onValidationStart) {
    options.onValidationStart();
  }

  const validation = await pollImportResultStatus(stageId);
  return { stageId, validation };
}