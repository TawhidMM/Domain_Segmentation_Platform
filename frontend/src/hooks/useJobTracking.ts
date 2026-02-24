import { useEffect, useState, useCallback, useRef } from 'react';
import { JobStatus, ExperimentResult, ExperimentMetrics } from '@/types';
import { fetchJobStatus, fetchExperimentResult, fetchExperimentMetrics } from '@/services/experimentService';

interface UseJobTrackingState {
  status: JobStatus | null;
  result: ExperimentResult | null;
  metrics: ExperimentMetrics | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  errorCode?: number; // For 403, 404, etc.
}

export function useJobTracking(jobId: string, accessToken: string | null): UseJobTrackingState {
  const [state, setState] = useState<UseJobTrackingState>({
    status: null,
    result: null,
    metrics: null,
    isLoading: true,
    isPolling: false,
    error: null,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch job status
  const fetchStatus = useCallback(async () => {
    if (!accessToken) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Invalid access link',
        errorCode: 400,
      }));
      return null;
    }

    try {
      const response = await fetchJobStatus(jobId, accessToken);
      
      if (!isMountedRef.current) return null;

      setState((prev) => ({
        ...prev,
        status: response.status,
        error: null,
        isLoading: false,
      }));

      return response.status;
    } catch (err) {
      if (!isMountedRef.current) return null;

      const error = err as { response?: { status?: number } };
      const errorCode = error.response?.status;
      const errorMsg =
        errorCode === 403
          ? 'Unauthorized access'
          : errorCode === 404
          ? 'Job not found or expired'
          : 'Failed to fetch job status';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
        errorCode,
      }));

      return null;
    }
  }, [jobId, accessToken]);

  // Fetch result and metrics
  const fetchResult = useCallback(async () => {
    if (!accessToken) return;

    try {
      console.log(`[useJobTracking] Fetching result for job ${jobId}`);
      const [resultData, metricsData] = await Promise.all([
        fetchExperimentResult(jobId, accessToken),
        fetchExperimentMetrics(jobId, accessToken).catch(() => null), // Metrics are optional
      ]);

      if (!isMountedRef.current) return;

      console.log(`[useJobTracking] Result fetched for job ${jobId}:`, {
        hasSpots: !!resultData?.spots,
        spotCount: resultData?.spots?.length,
        hasDomains: !!resultData?.domains,
        domainCount: resultData?.domains?.length,
        hasMetrics: !!metricsData,
      });

      setState((prev) => ({
        ...prev,
        result: resultData,
        metrics: metricsData,
        error: null,
      }));
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err as { response?: { status?: number } };
      const errorCode = error.response?.status;
      const errorMsg =
        errorCode === 403
          ? 'Unauthorized access'
          : 'Failed to fetch results';

      console.error(`[useJobTracking] Failed to fetch result for job ${jobId}:`, err);

      setState((prev) => ({
        ...prev,
        error: errorMsg,
        errorCode,
      }));
    }
  }, [jobId, accessToken]);

  // Main polling effect
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchStatus().then((initialStatus) => {
      if (!isMountedRef.current) return;

      if (initialStatus === 'finished') {
        // Fetch results immediately
        fetchResult();
      } else if (initialStatus === 'queued' || initialStatus === 'running') {
        // Start polling
        setState((prev) => ({ ...prev, isPolling: true }));
        
        pollingIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current) return;
          
          fetchStatus().then((newStatus) => {
            if (!isMountedRef.current) return;

            if (newStatus === 'finished') {
              // Stop polling and fetch results
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setState((prev) => ({ ...prev, isPolling: false }));
              fetchResult();
            } else if (newStatus === 'failed') {
              // Stop polling on failure
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setState((prev) => ({ ...prev, isPolling: false }));
            }
          });
        }, 5000); // Poll every 5 seconds
      }
    });

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [jobId, accessToken, fetchStatus, fetchResult]);

  return state;
}
