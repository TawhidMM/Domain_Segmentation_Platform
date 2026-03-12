export type ExperimentStatus = 'not-submitted' | 'queued' | 'running' | 'completed';

export type DatasetUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';

export type DatasetQueueStatus = 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';

export interface DatasetUploadEntry {
  id: string;
  datasetId: string | null;
  name: string;
  size: number;
  uploadProgress: number;
  status: DatasetUploadStatus;
}

export interface DatasetUploadQueueItem {
  id: string;
  file: File;
  fileName: string;
  datasetName: string;
  datasetId: string | null;
  size: number;
  uploadProgress: number;
  status: DatasetQueueStatus;
  error?: string;
}

export interface Dataset {
  id: string;
  uploadId: string | null;
  datasetUploadQueue: DatasetUploadQueueItem[];
  spatialCoordinatesFile: File | null;
  tissueImageFile: File | null;
  summary: {
    spotCount: number;
    geneCount: number;
  } | null;
}

export interface ParameterValue {
  [key: string]: number | string | boolean;
}

export interface Experiment {
  id: string;
  toolId: string;
  toolName: string;
  jobId?: string;
  accessToken?: string;
  parameters: ParameterValue;
  numberOfRuns: number;
  status: ExperimentStatus;
  createdAt: Date;
  completedAt: Date | null;
  result: ExperimentResult | null;
  metrics?: ExperimentMetrics | null;
}

export interface Spot {
  barcode: string;
  x: number;
  y: number;
  domain: number;
}

export interface Domain {
  domain_id: number;
  color: string;
}

export interface ExperimentResult {
  jobId: string;
  toolName?: string;
  spots: Spot[];
  domains: Domain[];
  has_histology?: boolean;
}

export interface ExperimentMetrics {
  silhouette: number;
  davies_bouldin: number;
  calinski_harabasz: number;
  morans_I: number;
  gearys_C: number;
}

export interface ConsensusSpot {
  barcode: string;
  x: number;
  y: number;
  consensus_domain: number;
  confidence: number;
}

export interface ExperimentRequest {
  experiment_id: string;
  token: string;
}

export interface ConsensusResponse {
  metadata: {
    num_experiments: number;
    reference_experiment_id: string;
    num_spots: number;
  };
  spots: ConsensusSpot[];
}

export type ParameterType = 'slider' | 'number' | 'select' | 'checkbox';

export interface ParameterConfig {
  id: string;
  label: string;
  type: ParameterType;
  defaultValue: number | string | boolean;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  advanced?: boolean;
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  parameters: ParameterConfig[];
}

// API-based tool schema types
export type ToolParameterType = 'int' | 'enum' | 'float_range' | 'int_list' | 'float_list' | 'bool' | 'float';

export interface FloatRangeDefault {
  min: number;
  max: number;
  step: number;
}

export interface DependsOnCondition {
  [paramKey: string]: string[];
}

export interface ToolParameterSchema {
  type: ToolParameterType;
  label: string;
  default?: number | string | number[] | FloatRangeDefault;
  min?: number;
  max?: number;
  options?: string[];
  depends_on?: DependsOnCondition;
  ui_group: 'basic' | 'advanced';
}

export interface ProfileOverrides {
  [paramKey: string]: number | string | number[];
}

export interface ToolProfile {
  overrides: ProfileOverrides;
}

export interface ToolSchema {
  tool_id: string;
  label: string;
  description: string;
  parameters: {
    [key: string]: ToolParameterSchema;
  };
  profiles?: {
    [profileName: string]: ToolProfile;
  };
}

export type WorkspaceMode = 'upload' | 'builder' | 'focus' | 'comparison';

// Job tracking types
export type JobStatus = 'queued' | 'running' | 'finished' | 'failed';

export interface JobSubmissionResponse {
  experiment_id: string;
  access_token: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  status: JobStatus;
  error?: string;
}

// Experiment Details Page Types
export interface RunDetail {
  run_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface DatasetGroup {
  dataset_id: string;
  runs: RunDetail[];
}

export interface ExperimentDetails {
  experiment_id: string;
  tool_name: string;
  started_at: string | null;
  finished_at: string | null;
  datasets: DatasetGroup[];
}

export interface RunStatus {
  run_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
}

export type RunStatusValue = 'queued' | 'running' | 'finished' | 'failed';

// Comparison datasets types
export interface ComparisonDatasetTool {
  tool_name: string;
  experiment_id: string;
  token: string;
}

export interface ComparisonDatasetToolResponse {
  tool_name: string;
  experiment_id: string;
}

export interface ComparisonDatasetResponse {
  dataset_id: string;
  tools: ComparisonDatasetToolResponse[];
}

export interface ComparisonDataset {
  dataset_id: string;
  tools: ComparisonDatasetTool[];
}

export interface ComparisonDatasetsResponse {
  datasets: ComparisonDatasetResponse[];
}
