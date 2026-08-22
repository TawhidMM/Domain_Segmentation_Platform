import axios from '@/lib/axios';
import {
  ExperimentMetrics,
  ExperimentResult,
  ConsensusResponse,
  ExperimentDetails,
  RunStatus,
  Run,
  ExperimentRequest,
  ComparisonDatasetsResponse,
} from '@/types';
import { DomainComparisonResponse } from '@/components/visualization/domainComparison/types';
import { JobSubmissionResponse, ExperimentSubmitResponse } from '@/types';

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

export interface ImportResultsDatasetRequestPayload {
  dataset_id: string;
  stage_id: string;
}

export interface ImportResultRequestPayload {
  results: ImportResultsDatasetRequestPayload[];
  experiment_name: string;
}


export async function fetchExperimentResult(runId: string, token: string): Promise<ExperimentResult> {
  const res = await axios.get(`/runs/${runId}/result`, { params: { token } });
  return res.data as ExperimentResult;
}

export async function fetchExperimentMetrics(runId: string, token: string): Promise<ExperimentMetrics> {
  const res = await axios.get(`/runs/${runId}/metrics`, { params: { token } });
  return res.data as ExperimentMetrics;
}

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

export async function downloadCompareMetricBoxplots(experiments: ExperimentRequest[]): Promise<Blob> {
  const res = await axios.post(
    `/experiments/compare/download-boxplots`,
    { experiments },
    { responseType: 'blob' }
  );
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

export interface BestRunResponse {
  run_id: string;
  result: ExperimentResult;
  metrics: ExperimentMetrics;
}

export async function fetchBestRunResult(
  experimentId: string,
  datasetId: string,
  token: string,
): Promise<BestRunResponse> {
  const res = await axios.post(`/experiments/best-run`, {
    experiment_id: experimentId,
    dataset_id: datasetId,
    token,
  });
  return res.data as BestRunResponse;
}

export async function fetchAllExperimentRunMetrics(
  experimentId: string,
  token: string,
): Promise<any> {
  const res = await axios.post(`/experiments/run-metrics`, {
    experiment_id: experimentId,
    token,
  });
  return res.data;
}

export async function fetchComparisonDatasets(experiments: ExperimentRequest[]): Promise<ComparisonDatasetsResponse> {
  const res = await axios.post(`/experiments/comparison/datasets`, { experiments });
  return res.data as ComparisonDatasetsResponse;
}


export async function checkExperimentsExistence(experiments: Array<{ experiment_id: string; token: string }>): Promise<string[]> {
  const res = await axios.post<{ validIds: string[] }>(`/experiments/check-existence`, {
    experiments: experiments.map(({ experiment_id, token }) => ({ experiment_id, token })),
  });
  return res.data.validIds;
}

export async function submitImportedResult(
  request: ImportResultRequestPayload,
): Promise<JobSubmissionResponse> {
  const res = await axios.post<JobSubmissionResponse>(`/experiments/submit-imported`, request);
  return res.data;
}

/**
 * Patch backend run details onto the existing frontend runs.
 * The existing array owns display order and client-side run identity.
 */
export function patchRunsWithDetails(existingRuns: Run[], details: ExperimentDetails): Run[] {
  const detailsByRun = new Map(
    details.datasets.flatMap((dataset) =>
      dataset.runs.map((run) => [`${dataset.dataset_id}::${run.seed}`, run] as const)
    )
  );

  return existingRuns.map((run) => {
    const incoming = detailsByRun.get(`${run.datasetId}::${run.seed}`);
    if (!incoming) return run;

    return {
      ...run,
      runId: incoming.run_id || run.runId,
      status: mapRunStatus(incoming.status) as Run['status'],
    };
  });
}

/**
 * Map backend run status to frontend Run status type.
 * 'finished' becomes 'completed' to match ExperimentStatus.
 */
function mapRunStatus(status: string): string {
  if (status === 'finished') {
    return 'completed';
  }
  return status;
}