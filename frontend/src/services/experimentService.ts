import axios from '@/lib/axios';
import { ExperimentMetrics, ExperimentResult, JobStatusResponse, ConsensusResponse, ExperimentDetails, RunStatus } from '@/types';

export async function fetchExperimentResult(runId: string, token?: string): Promise<ExperimentResult> {
  const params = token ? { token } : {};
  const res = await axios.get(`/experiments/runs/${runId}/result`, { params });
  return res.data as ExperimentResult;
}

export async function fetchExperimentMetrics(runId: string, token?: string): Promise<ExperimentMetrics> {
  const params = token ? { token } : {};
  const res = await axios.get(`/experiments/runs/${runId}/metrics`, { params });
  return res.data as ExperimentMetrics;
}

export async function fetchJobStatus(jobId: string, token: string): Promise<JobStatusResponse> {
  const res = await axios.get(`/experiments/jobs/${jobId}`, { params: { token } });
  return res.data as JobStatusResponse;
}

// New endpoints for experiment details page
export async function fetchExperimentDetails(experimentId: string, token: string): Promise<ExperimentDetails> {
  const res = await axios.get(`/experiments/${experimentId}`, { params: { token } });
  return res.data as ExperimentDetails;
}

export async function fetchRunStatus(runId: string, token: string): Promise<RunStatus> {
  const res = await axios.get(`/experiments/runs/${runId}`, { params: { token } });
  return res.data as RunStatus;
}

export async function exportExperiment(runId: string, format: 'svg' | 'pdf', token?: string): Promise<Blob> {
  const params = token ? { token, format } : { format };
  const res = await axios.get(`/experiments/runs/${runId}/export`, { 
    params,
    responseType: 'blob'
  });
  return res.data as Blob;
}

export async function exportExperimentUmap(runId: string, token: string): Promise<Blob> {
  const params = { token };
  const res = await axios.get(`/experiments/runs/${runId}/export/umap`, {
    params,
    responseType: 'blob'
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

export async function fetchConsensusData(encodedPayload: string): Promise<ConsensusResponse> {
  const params = { c: encodedPayload };
  const res = await axios.get(`/experiments/compare/consensus`, { params });
  return res.data as ConsensusResponse;
}

export async function fetchBestRunResult(experimentId: string, token: string): Promise<ExperimentResult> {
  const params = { token };
  const res = await axios.get(`/experiments/${experimentId}/best-run`, { params });
  return res.data as ExperimentResult;
}

export async function fetchAllExperimentRunMetrics(experimentId: string, token: string): Promise<any> {
  const params = { token };
  const res = await axios.get(`/experiments/${experimentId}/run-metrics`, { params });
  return res.data;
}
