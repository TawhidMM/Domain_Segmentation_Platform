import axios from '@/lib/axios';
import { ExperimentResult } from '@/types';

export async function fetchExperimentResult(jobId: string): Promise<ExperimentResult> {
  const res = await axios.get(`experiments/result/${jobId}`);
  return res.data as ExperimentResult;
}
