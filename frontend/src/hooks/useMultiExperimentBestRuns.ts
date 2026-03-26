import { useEffect, useState, useCallback, useRef } from 'react';
import { ExperimentResult } from '@/types';
import { fetchAllExperimentRunMetrics, fetchBestRunResult } from '@/services/experimentService';

export interface ExperimentBestRunData {
  experimentId: string;
  result: ExperimentResult | null;
  bestRunId: string | null;
  totalRuns: number;
  isLoading: boolean;
  error: string | null;
  errorCode?: number;
}

export interface AllExperimentRunMetrics {
  experiment_id: string;
  tool_name: string;
  runs: Array<{
    run_id: string;
    metrics: {
      silhouette: number;
      davies_bouldin: number;
      calinski_harabasz: number;
      moran_i: number;
      geary_c: number;
    };
  }>;
}

export interface ExperimentMetricsData {
  experimentId: string;
  metricsData: AllExperimentRunMetrics | null;
  isLoading: boolean;
  error: string | null;
  errorCode?: number;
}

export function useMultiExperimentBestRuns(
  experimentIds: string[],
  tokens: string[],
  datasetId: string | null,
) {
  const [bestRunState, setBestRunState] = useState<{ [expId: string]: ExperimentBestRunData }>({});
  const [metricsState, setMetricsState] = useState<{ [expId: string]: ExperimentMetricsData }>({});
  const isMountedRef = useRef(true);

  // Initialize state for all experiments
  useEffect(() => {
    const initialBestRunState: { [expId: string]: ExperimentBestRunData } = {};
    const initialMetricsState: { [expId: string]: ExperimentMetricsData } = {};

    experimentIds.forEach((expId) => {
      initialBestRunState[expId] = {
        experimentId: expId,
        result: null,
        bestRunId: null,
        totalRuns: 0,
        isLoading: true,
        error: null,
      };
      initialMetricsState[expId] = {
        experimentId: expId,
        metricsData: null,
        isLoading: true,
        error: null,
      };
    });

    setBestRunState(initialBestRunState);
    setMetricsState(initialMetricsState);
  }, [experimentIds.join(',')]);

  // Fetch best run result and all run metrics for a single experiment
  const fetchExperimentData = useCallback(
    async (experimentId: string, token: string) => {
      if (!token) {
        setBestRunState((prev) => ({
          ...prev,
          [experimentId]: {
            experimentId,
            result: null,
            bestRunId: null,
            totalRuns: 0,
            isLoading: false,
            error: 'Invalid access token',
            errorCode: 400,
          },
        }));
        setMetricsState((prev) => ({
          ...prev,
          [experimentId]: {
            experimentId,
            metricsData: null,
            isLoading: false,
            error: 'Invalid access token',
            errorCode: 400,
          },
        }));
        return;
      }

      if (!datasetId) {
        return;
      }

      try {
        const [result, metrics] = await Promise.all([
          fetchBestRunResult(experimentId, datasetId, token),
          fetchAllExperimentRunMetrics(experimentId, token),
        ]);

        if (!isMountedRef.current) return;

        const bestRunId = result?.jobId || null;
        const totalRuns = metrics?.runs?.length || 0;

        setBestRunState((prev) => ({
          ...prev,
          [experimentId]: {
            experimentId,
            result,
            bestRunId,
            totalRuns,
            isLoading: false,
            error: null,
          },
        }));

        setMetricsState((prev) => ({
          ...prev,
          [experimentId]: {
            experimentId,
            metricsData: metrics,
            isLoading: false,
            error: null,
          },
        }));
      } catch (err) {
        if (!isMountedRef.current) return;

        const error = err as { response?: { status?: number } };
        const errorCode = error.response?.status;
        const errorMsg =
          errorCode === 403
            ? 'Unauthorized access'
            : errorCode === 404
              ? 'Experiment not found'
              : 'Failed to fetch experiment data';

        console.error(`[useMultiExperimentBestRuns] Failed for ${experimentId}:`, err);

        setBestRunState((prev) => ({
          ...prev,
          [experimentId]: {
            experimentId,
            result: null,
            bestRunId: null,
            totalRuns: 0,
            isLoading: false,
            error: errorMsg,
            errorCode,
          },
        }));

        setMetricsState((prev) => ({
          ...prev,
          [experimentId]: {
            experimentId,
            metricsData: null,
            isLoading: false,
            error: errorMsg,
            errorCode,
          },
        }));
      }
    },
    [datasetId],
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!datasetId) {
      return () => {
        isMountedRef.current = false;
      };
    }

    experimentIds.forEach((expId, idx) => {
      const token = tokens[idx];
      fetchExperimentData(expId, token);
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [datasetId, experimentIds.join(','), tokens.join(','), fetchExperimentData]);

  return {
    bestRunState,
    metricsState,
  };
}
