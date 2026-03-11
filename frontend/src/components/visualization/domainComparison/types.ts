export interface DomainComparisonRequestItem {
  experiment_id: string;
  dataset_id: string;
  token: string;
}

export interface DomainComparisonExperimentMeta {
  experiment_id: string;
  tool_name: string;
}

export interface DomainComparisonSpot {
  barcode: string;
  x: number;
  y: number;
  A: number;
  B: number;
}

export interface DomainMetric {
  domain: number;
  intersection: number;
  expA_only: number;
  expB_only: number;
  jaccard: number;
}

export interface DomainComparisonResponse {
  experiments: {
    A: DomainComparisonExperimentMeta;
    B: DomainComparisonExperimentMeta;
  };
  spots: DomainComparisonSpot[];
  domain_metrics: DomainMetric[];
}

export interface CompareToolSelection {
  experiment_id: string;
  token: string;
  tool_name: string;
}
