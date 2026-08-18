import { Experiment } from '@/types';
import { checkDependsOn } from './dependsOn';

export function experimentRequiresAnnotation(exp: Experiment): boolean {
  const req = exp.requirements?.manual_annotation;
  return Boolean(req?.is_required && checkDependsOn(req.depends_on, exp.parameters));
}

export function isExperimentReadyToSubmit(exp: Experiment): boolean {
  if (!experimentRequiresAnnotation(exp)) return true;
  if (exp.datasetIds.length === 0) return false;
  return exp.datasetIds.every((datasetId) => Boolean(exp.annotationIds?.[datasetId]));
}

export interface SkippedExperiment {
  id: string;
  experimentName: string;
  reason: string;
}

export interface SubmitSkipResult {
  redirectInfo: { experimentId: string; accessToken: string } | null;
  submittedCount: number;
  skipped: SkippedExperiment[];
}
