export const ExperimentStatus = {
  NOT_SUBMITTED: 'not-submitted',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ExperimentStatus = (typeof ExperimentStatus)[keyof typeof ExperimentStatus];


export const DatasetExtractionStatus = {
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type DatasetExtractionStatus = (typeof DatasetExtractionStatus)[keyof typeof DatasetExtractionStatus];


export const DownloadPhase = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  HANDED_OFF: 'handed_off',
  FAILED: 'failed',
} as const;

export type DownloadPhase = (typeof DownloadPhase)[keyof typeof DownloadPhase];


export const ValidationStatus = {
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type ValidationStatus = (typeof ValidationStatus)[keyof typeof ValidationStatus];


export const ValidationErrorType = {
  MISSING_FILES: 'MISSING_FILES',
  FILE_SHAPE_MISMATCH: 'FILE_SHAPE_MISMATCH',
  BARCODE_ALIGNMENT_FAILURE: 'BARCODE_ALIGNMENT_FAILURE',
  SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
  INVALID_DATA_TYPES: 'INVALID_DATA_TYPES',
  INTERNAL_SYSTEM_ERROR: 'INTERNAL_SYSTEM_ERROR',
} as const;

export type ValidationErrorType = (typeof ValidationErrorType)[keyof typeof ValidationErrorType];


export const DatasetUploadStatus = {
  PENDING: 'PENDING',
  UPLOADING: 'UPLOADING',
  DOWNLOADING: 'DOWNLOADING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const;

export type DatasetUploadStatus = (typeof DatasetUploadStatus)[keyof typeof DatasetUploadStatus];


export const BootstrapPhase = {
  PENDING: 'pending',
  HYDRATING: 'hydrating',
  VALIDATING: 'validating',
  RESTORING: 'restoring',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type BootstrapPhase = (typeof BootstrapPhase)[keyof typeof BootstrapPhase];