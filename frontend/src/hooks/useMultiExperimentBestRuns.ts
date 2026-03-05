import { useEffect, useState, useCallback, useRef } from 'react';
import { ExperimentResult } from '@/types';
import axios from '@/lib/axios';

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

export function useMultiExperimentBestRuns(experimentIds: string[], tokens: string[]) {
  const [bestRunState, setBestRunState] = useState<{ [expId: string]: ExperimentBestRunData }>({});
  const [metricsState, setMetricsState] = useState<{ [expId: string]: ExperimentMetricsData }>({});
  const isMountedRef = useRef(true);

  // Initialize state for all experiments
  useEffect(() => {
    const initialBestRunState: { [expId: string]: ExperimentBestRunData } = {};
    const initialMetricsState: { [expId: string]: ExperimentMetricsData } = {};

    experimentIds.forEach((expId) => {
      if (!initialBestRunState[expId]) {
        initialBestRunState[expId] = {
          experimentId: expId,
          result: null,
          bestRunId: null,
          totalRuns: 0,
          isLoading: true,
          error: null,
        };
      }
      if (!initialMetricsState[expId]) {
        initialMetricsState[expId] = {
          experimentId: expId,
          metricsData: null,
          isLoading: true,
          error: null,
        };
      }
    });

    setBestRunState(initialBestRunState);
    setMetricsState(initialMetricsState);
  }, [experimentIds.length]);

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

      try {
        // Fetch best run result and all metrics in parallel
        const [bestRunResult, metricsData] = await Promise.all([
          axios.get(`/experiments/${experimentId}/best-run`, { params: { token } }),
          axios.get(`/experiments/${experimentId}/run-metrics`, { params: { token } }),
        ]);

        if (!isMountedRef.current) return;

        const result = bestRunResult.data as ExperimentResult;
        const metrics = metricsData.data as AllExperimentRunMetrics;

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

        const error = err as { response?: { status?: number }; message?: string };
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
    []
  );

  // Fetch data for all experiments on mount
  useEffect(() => {
    isMountedRef.current = true;

    experimentIds.forEach((expId, idx) => {
      const token = tokens[idx];
      fetchExperimentData(expId, token);
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [experimentIds.join(','), tokens.join(','), fetchExperimentData]);

  return {
    bestRunState,
    metricsState,
  };
}
