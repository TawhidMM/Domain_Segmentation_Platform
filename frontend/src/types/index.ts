export type ExperimentStatus = 'not-submitted' | 'queued' | 'running' | 'completed';

export interface Dataset {
  id: string;
  uploadId: string | null; // Backend upload_id from file upload
  geneExpressionFile: null | {
    name: string;
    size: number;
    uploadProgress: number;
    status: 'idle' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';
  };
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
  jobId?: string; // Backend job identifier
  parameters: ParameterValue;
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
}

export interface ExperimentMetrics {
  silhouette: number;
  davies_bouldin: number;
  calinski_harabasz: number;
  morans_I: number;
  gearys_C: number;
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
  job_id: string;
  access_token: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  status: JobStatus;
  error?: string;
}
