import { useMemo } from 'react';
import { METRIC_CONFIG, MetricDefinition } from '@/config/metricsConfig';
import { ExperimentMetrics } from '@/types';

interface MetricValue {
  jobId: string;
  value: number | null;
}

interface BestMetricResult {
  metricKey: string;
  bestJobIds: string[];
}

interface UseMetricsAnalysisParams {
  jobs: Array<{
    id: string;
    metrics: ExperimentMetrics | null;
  }>;
}

/**
 * Custom hook for analyzing metrics and identifying best values
 * Memoizes computation to avoid recalculation on every render
 */
export function useMetricsAnalysis({ jobs }: UseMetricsAnalysisParams) {
  const bestMetrics = useMemo(() => {
    const results: BestMetricResult[] = [];

    METRIC_CONFIG.forEach((metricDef) => {
      const values: MetricValue[] = jobs
        .map((job) => ({
          jobId: job.id,
          value: job.metrics?.[metricDef.key as keyof ExperimentMetrics] ?? null,
        }))
        .filter((v) => v.value !== null);

      if (values.length === 0) {
        results.push({ metricKey: metricDef.key, bestJobIds: [] });
        return;
      }

      // Find best value(s)
      const numericValues = values.map((v) => v.value as number);
      const bestValue =
        metricDef.better === 'higher'
          ? Math.max(...numericValues)
          : Math.min(...numericValues);

      // Find all jobs with the best value (handles ties)
      const bestJobIds = values
        .filter((v) => v.value === bestValue)
        .map((v) => v.jobId);

      results.push({ metricKey: metricDef.key, bestJobIds });
    });

    return results;
  }, [jobs]);

  /**
   * Check if a specific job has the best value for a metric
   */
  const isBestValue = useMemo(
    () => (metricKey: string, jobId: string): boolean => {
      const result = bestMetrics.find((r) => r.metricKey === metricKey);
      return result?.bestJobIds.includes(jobId) ?? false;
    },
    [bestMetrics]
  );

  /**
   * Format metric value with consistent precision
   */
  const formatMetricValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    return value.toFixed(3);
  };

  return {
    bestMetrics,
    isBestValue,
    formatMetricValue,
  };
}
