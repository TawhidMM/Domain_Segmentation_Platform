import { useEffect, useRef, useCallback } from 'react';
import { useExperimentsStore } from '@/stores/experiments';
import { fetchExperimentDetails, patchRunsWithDetails } from '@/services/experimentService';
import type { ExperimentStatus } from '@/types';

interface UseExperimentPollingOptions {
  /** Store experiment id (Experiment['id']) to track while in-flight */
  experimentId: string;
  /** Polling interval in milliseconds (defaults to 5000) */
  intervalMs?: number;
}

/**
 * Polls experiment details while the experiment is in-flight.
 *
 * - Starts polling when the experiment status is 'queued' or 'running'
 * - Fetches backend experiment details, patches run statuses, and updates the store
 * - Stops when status becomes 'completed' or 'failed'
 * - Cleans up on unmount
 *
 * Usage:
 *   const { manualRefresh, isPolling } = useExperimentPolling({ experimentId: experiment.id });
 */
export function useExperimentPolling({
  experimentId,
  intervalMs = 5000,
}: UseExperimentPollingOptions): { manualRefresh: () => void; isPolling: boolean } {
  const updateExperimentRuns = useExperimentsStore((state) => state.updateExperimentRuns);
  const updateExperimentStatus = useExperimentsStore((state) => state.updateExperimentStatus);

  // Live status from the store - drives polling on/off.
  const status = useExperimentsStore((state) =>
    state.experiments.find((e) => e.id === experimentId)?.status
  );

  const pollExperimentDetails = useCallback(async () => {
    // Read freshest state from the store so we never patch against stale runs.
    const current = useExperimentsStore.getState().experiments.find((e) => e.id === experimentId);
    if (!current?.experimentId || !current.accessToken) return;

    try {
      const experimentDetails = await fetchExperimentDetails(current.experimentId, current.accessToken);
      const runs = patchRunsWithDetails(current.runs ?? [], experimentDetails);
      updateExperimentRuns(current.id, runs);
      updateExperimentStatus(current.id, experimentDetails.experiment_status as ExperimentStatus);
    } catch (error) {
      console.error('Failed to poll experiment details:', error);
    }
  }, [experimentId, updateExperimentRuns, updateExperimentStatus]);

  const isPollingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if we should poll based on live store status.
  const shouldStartPolling = status === 'queued' || status === 'running';

  const pollOnce = useCallback(() => {
    pollExperimentDetails();
  }, [pollExperimentDetails]);

  useEffect(() => {
    if (!shouldStartPolling) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isPollingRef.current = false;
      }
      return;
    }

    // Start polling
    if (!intervalRef.current) {
      isPollingRef.current = true;
      intervalRef.current = setInterval(() => {
        pollOnce();
      }, intervalMs);
      // Immediate first check
      pollOnce();
    }

    // Cleanup on unmount or status change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isPollingRef.current = false;
      }
    };
  }, [shouldStartPolling, pollOnce, intervalMs]);

  const manualRefresh = useCallback(() => {
    pollOnce();
  }, [pollOnce]);

  return { manualRefresh, isPolling: isPollingRef.current };
}
