import { ExperimentStatus, DatasetUploadStatus } from './status';

export * from './status';
export * from './workspace';


export interface DatasetItem {
  id: string;
  file?: File;
  fileName: string;
  datasetName: string;
  datasetId: string | null;
  taskId?: string;
  size: number;
  uploadProgress: number;
  status: DatasetUploadStatus;
  error?: string;
}

export interface ParameterValue {
  [key: string]: number | string | boolean;
}

export interface Experiment {
  id: string;
  toolId: string;
  experimentName: string;
  datasetIds: string[];
  requirements?: ToolRequirements;
  experimentId?: string;
  accessToken?: string;
  parameters: ParameterValue;
  numberOfRuns: number;
  seedList: number[];
  status: ExperimentStatus;
  createdAt: Date;
  completedAt: Date | null;
  result: ExperimentResult | null;
  metrics?: ExperimentMetrics | null;
  runs?: Run[];
  datasetParams?: Record<string, Record<string, unknown>>;
  annotationIds?: Record<string, string>;
  toolSchema?: ToolSchema;
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
  experimentId: string;
  experimentName?: string;
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


export type ToolParameterType = 'int' | 'enum' | 'float_range' | 'int_list' | 'float_list' | 'bool' | 'float';

export interface FloatRangeDefault {
  min: number;
  max: number;
  step: number;
}

export interface DependsOnCondition {
  [paramKey: string]: Array<string | number | boolean>;
}

export interface ManualAnnotationRequirement {
  is_required: boolean;
  depends_on?: DependsOnCondition;
}

export interface ToolRequirements {
  manual_annotation?: ManualAnnotationRequirement;
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
  requirements?: ToolRequirements;
  parameters: {
    [key: string]: ToolParameterSchema;
  };
  profiles?: {
    [profileName: string]: ToolProfile;
  };
}

// Job tracking types
export interface JobSubmissionResponse {
  experiment_id: string;
  access_token: string;
  status: ExperimentStatus;
}

// Experiment Details Page Types
export interface RunDetail {
  run_id: string;
  seed: number;
  status: ExperimentStatus;
  started_at: string | null;
  finished_at: string | null;
}

export interface DatasetGroup {
  dataset_id: string;
  dataset_name: string;
  runs: RunDetail[];
}

export interface ExperimentDetails {
  experiment_id: string;
  experiment_name: string;
  experiment_status: ExperimentStatus;
  started_at: string | null;
  finished_at: string | null;
  datasets: DatasetGroup[];
}

export interface RunStatus {
  run_id: string;
  status: ExperimentStatus;
  started_at: string | null;
  finished_at: string | null;
}

export interface Run {
  id: string;
  runId: string;
  datasetId: string;
  seed: number;
  status: ExperimentStatus;
  result?: ExperimentResult | null;
}

export interface DatasetRunMapping {
  dataset_id: string;
  run_ids: string[];
}

export interface ExperimentSubmitResponse {
  experiment_id: string;
  access_token: string;
  status: string;
  runs_by_dataset: DatasetRunMapping[];
}

// Comparison datasets types
export interface ComparisonExperiments {
  experiment_name: string;
  experiment_id: string;
  token: string;
}

export interface ComparisonDatasetToolResponse {
  experiment_name: string;
  experiment_id: string;
}

export interface ComparisonDatasetResponse {
  dataset_id: string;
  dataset_name: string;
  tools: ComparisonDatasetToolResponse[];
}

export interface ComparisonDataset {
  dataset_id: string;
  dataset_name: string;
  experiments: ComparisonExperiments[];
}

export interface ComparisonDatasetsResponse {
  datasets: ComparisonDatasetResponse[];
}

export interface RunStatusCounts {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  notSubmitted: number;
  total: number;
}

export function countRunsByStatus(runs: Run[] | undefined): RunStatusCounts {
  const allRuns = runs ?? [];
  return {
    queued: allRuns.filter((r) => r.status === ExperimentStatus.QUEUED).length,
    running: allRuns.filter((r) => r.status === ExperimentStatus.RUNNING).length,
    completed: allRuns.filter((r) => r.status === ExperimentStatus.COMPLETED).length,
    failed: allRuns.filter((r) => r.status === ExperimentStatus.FAILED).length,
    notSubmitted: allRuns.filter((r) => r.status === ExperimentStatus.NOT_SUBMITTED).length,
    total: allRuns.length,
  };
}