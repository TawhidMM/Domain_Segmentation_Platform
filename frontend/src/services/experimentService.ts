import axios from '@/lib/axios';
import { ExperimentMetrics, ExperimentResult, JobStatusResponse, ConsensusResponse } from '@/types';

export async function fetchExperimentResult(jobId: string, token?: string): Promise<ExperimentResult> {
  const params = token ? { token } : {};
  const res = await axios.get(`/experiments/result/${jobId}`, { params });
  return res.data as ExperimentResult;
}

export async function fetchExperimentMetrics(jobId: string, token?: string): Promise<ExperimentMetrics> {
  const params = token ? { token } : {};
  const res = await axios.get(`/experiments/metrics/${jobId}`, { params });
  return res.data as ExperimentMetrics;
}

export async function fetchJobStatus(jobId: string, token: string): Promise<JobStatusResponse> {
  const res = await axios.get(`/experiments/jobs/${jobId}`, { params: { token } });
  return res.data as JobStatusResponse;
}

export async function exportExperiment(jobId: string, format: 'svg' | 'pdf', token?: string): Promise<Blob> {
  const params = token ? { token, format } : { format };
  const res = await axios.get(`/experiments/export/${jobId}`, { 
    params,
    responseType: 'blob'
  });
  return res.data as Blob;
}

export async function exportExperimentUmap(jobId: string, token: string): Promise<Blob> {
  const params = { token };
  const res = await axios.get(`/experiments/${jobId}/export/umap`, {
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
