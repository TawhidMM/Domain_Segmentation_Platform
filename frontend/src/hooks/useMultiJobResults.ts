import { useEffect, useState, useCallback, useRef } from 'react';
import { ExperimentResult, ExperimentMetrics } from '@/types';
import { fetchExperimentResult, fetchExperimentMetrics } from '@/services/experimentService';

export interface JobResultState {
  result: ExperimentResult | null;
  metrics: ExperimentMetrics | null;
  isLoading: boolean;
  error: string | null;
  errorCode?: number;
}

export interface MultiJobResultsState {
  [jobId: string]: JobResultState;
}

/**
 * Fetches static results for multiple finished jobs in parallel.
 * No polling - jobs are assumed to be already finished when passed here.
 */
export function useMultiJobResults(jobIds: string[], tokens: string[]) {
  const [state, setState] = useState<MultiJobResultsState>({});
  const isMountedRef = useRef(true);

  // Initialize state for all jobs
  useEffect(() => {
    const initialState: MultiJobResultsState = {};
    jobIds.forEach((jobId) => {
      if (!initialState[jobId]) {
        initialState[jobId] = {
          result: null,
          metrics: null,
          isLoading: true,
          error: null,
        };
      }
    });
    setState(initialState);
  }, [jobIds.length]);

  // Create a token map for easier lookup
  const tokenMap = useCallback((): { [jobId: string]: string } => {
    const map: { [jobId: string]: string } = {};
    jobIds.forEach((jobId, index) => {
      map[jobId] = tokens[index] || '';
    });
    return map;
  }, [jobIds, tokens]);

  // Fetch results for a single job
  const fetchResults = useCallback(
    async (jobId: string) => {
      const token = tokenMap()[jobId];
      if (!token) {
        setState((prev) => ({
          ...prev,
          [jobId]: {
            result: null,
            metrics: null,
            isLoading: false,
            error: 'Invalid access token',
            errorCode: 400,
          },
        }));
        return;
      }

      try {
        console.log(`[useMultiJobResults] Fetching result for job ${jobId}`);
        const [resultData, metricsData] = await Promise.all([
          fetchExperimentResult(jobId, token),
          fetchExperimentMetrics(jobId, token).catch(() => null), // Metrics are optional
        ]);

        if (!isMountedRef.current) return;

        console.log(`[useMultiJobResults] Result fetched for job ${jobId}:`, {
          hasSpots: !!resultData?.spots,
          spotCount: resultData?.spots?.length,
          hasDomains: !!resultData?.domains,
          domainCount: resultData?.domains?.length,
          hasMetrics: !!metricsData,
        });

        setState((prev) => ({
          ...prev,
          [jobId]: {
            result: resultData,
            metrics: metricsData,
            isLoading: false,
            error: null,
          },
        }));
      } catch (err) {
        if (!isMountedRef.current) return;

        const error = err as { response?: { status?: number } };
        const errorCode = error.response?.status;
        const errorMsg =
          errorCode === 403 ? 'Unauthorized access' : 'Failed to fetch results';

        console.error(`[useMultiJobResults] Failed to fetch result for job ${jobId}:`, err);

        setState((prev) => ({
          ...prev,
          [jobId]: {
            result: null,
            metrics: null,
            isLoading: false,
            error: errorMsg,
            errorCode,
          },
        }));
      }
    },
    [tokenMap]
  );

  // Fetch results for all jobs on mount
  useEffect(() => {
    isMountedRef.current = true;

    // Fetch all results in parallel
    jobIds.forEach((jobId) => {
      fetchResults(jobId);
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [jobIds.join(',')]); // Re-run if job IDs change

  return state;
}
