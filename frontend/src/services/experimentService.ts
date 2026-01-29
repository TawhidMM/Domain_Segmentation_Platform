import axios from '@/lib/axios';
import { ExperimentMetrics, ExperimentResult } from '@/types';

export async function fetchExperimentResult(jobId: string): Promise<ExperimentResult> {
  const res = await axios.get(`experiments/result/${jobId}`);
  return res.data as ExperimentResult;
}

export async function fetchExperimentMetrics(jobId: string): Promise<ExperimentMetrics> {
  const res = await axios.get(`experiments/metrics/${jobId}`);
  return res.data as ExperimentMetrics;
}
