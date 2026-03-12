import axios from '@/lib/axios';
import {
  ExperimentMetrics,
  ExperimentResult,
  JobStatusResponse,
  ConsensusResponse,
  ExperimentDetails,
  RunStatus,
  ExperimentRequest,
  ComparisonDatasetsResponse,
} from '@/types';
import { DomainComparisonResponse } from '@/components/visualization/domainComparison/types';

export interface OverlayDomainMapSpot {
  spot_id: string;
  x: number;
  y: number;
  domains: Record<string, number>;
}

export interface OverlayDomainMapResponse {
  tools: string[];
  spots: OverlayDomainMapSpot[];
}

function getAggregateExperimentStatus(details: ExperimentDetails): JobStatusResponse {
  const runStatuses = details.datasets.flatMap((dataset) => dataset.runs.map((run) => run.status));

  if (runStatuses.length === 0) {
    return { status: 'failed' };
  }

  if (runStatuses.some((status) => status === 'running')) {
    return { status: 'running' };
  }

  if (runStatuses.some((status) => status === 'queued')) {
    return { status: 'queued' };
  }

  if (runStatuses.every((status) => status === 'failed')) {
    return { status: 'failed' };
  }

  if (runStatuses.some((status) => status === 'finished')) {
    return { status: 'finished' };
  }

  return { status: 'failed' };
}

export async function fetchExperimentResult(runId: string, token: string): Promise<ExperimentResult> {
  const res = await axios.get(`/runs/${runId}/result`, { params: { token } });
  return res.data as ExperimentResult;
}

export async function fetchExperimentMetrics(runId: string, token: string): Promise<ExperimentMetrics> {
  const res = await axios.get(`/runs/${runId}/metrics`, { params: { token } });
  return res.data as ExperimentMetrics;
}

export async function fetchJobStatus(experimentId: string, token: string): Promise<JobStatusResponse> {
  const details = await fetchExperimentDetails(experimentId, token);
  return getAggregateExperimentStatus(details);
}

// New endpoints for experiment details page
export async function fetchExperimentDetails(experimentId: string, token: string): Promise<ExperimentDetails> {
  if (!token) {
    throw new Error(`Missing token for experiment ${experimentId}`);
  }

  const res = await axios.post(`/experiments/details`, {
    experiment_id: experimentId,
    token,
  });
  return res.data as ExperimentDetails;
}

export async function fetchRunStatus(runId: string, token: string): Promise<RunStatus> {
  const res = await axios.get(`/runs/${runId}`, { params: { token } });
  return res.data as RunStatus;
}

export async function exportExperiment(runId: string, format: 'svg', token: string): Promise<Blob> {
  const params = { token, format };
  const res = await axios.get(`/runs/${runId}/export`, {
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
}

export async function exportExperimentUmap(runId: string, token: string): Promise<Blob> {
  const params = { token };
  const res = await axios.get(`/runs/${runId}/export/umap`, {
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
}

export async function exportComparisonMetrics(encodedPayload: string): Promise<Blob> {
  const params = { c: encodedPayload };
  const res = await axios.get(`/experiments/compare/export/metrics`, {
    params,
    responseType: 'blob'
  });
  return res.data as Blob;
}

export async function downloadCompareMetricBoxplots(experimentIds: string[]): Promise<Blob> {
  const res = await axios.post(
    `/experiments/compare/download-boxplots`,
    { experiment_ids: experimentIds },
    { responseType: 'blob' }
  );
  return res.data as Blob;
}

export async function exportComparisonMetricSvg(encodedPayload: string, metricKey: string): Promise<Blob> {
  const params = { c: encodedPayload, metric: metricKey };
  const res = await axios.get(`/experiments/compare/export/metrics`, {
    params,
    responseType: 'blob'
  });
  return res.data as Blob;
}

export async function fetchConsensusData(experiments: ExperimentRequest[], datasetId: string): Promise<ConsensusResponse> {
  const res = await axios.post(`/experiments/compare/consensus`, { experiments, dataset_id: datasetId });
  return res.data as ConsensusResponse;
}

export async function fetchDomainComparisonData(
  experiments: Array<{ experiment_id: string; token: string }>,
  datasetId: string,
): Promise<DomainComparisonResponse> {
  const res = await axios.post(`/experiments/domain-comparison`, {
    dataset_id: datasetId,
    experiments,
  });
  return res.data as DomainComparisonResponse;
}

export async function fetchOverlayDomainMapData(
  experiments: ExperimentRequest[],
  datasetId: string,
): Promise<OverlayDomainMapResponse> {
  const res = await axios.post(`/experiments/compare/overlay-domain-map`, { experiments, dataset_id: datasetId });
  return res.data as OverlayDomainMapResponse;
}

export async function fetchBestRunResult(
  experimentId: string,
  datasetId: string,
  token: string,
): Promise<ExperimentResult> {
  const res = await axios.post(`/experiments/best-run`, {
    experiment_id: experimentId,
    dataset_id: datasetId,
    token,
  });
  return res.data as ExperimentResult;
}

export async function fetchAllExperimentRunMetrics(
  experimentId: string,
  datasetId: string,
  token: string,
): Promise<any> {
  const res = await axios.post(`/experiments/run-metrics`, {
    experiment_id: experimentId,
    dataset_id: datasetId,
    token,
  });
  return res.data;
}

export async function fetchComparisonDatasets(experiments: ExperimentRequest[]): Promise<ComparisonDatasetsResponse> {
  const res = await axios.post(`/experiments/comparison/datasets`, { experiments });
  return res.data as ComparisonDatasetsResponse;
}
