import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import type { ExperimentStatus } from '@/types';

interface UseExperimentPollingOptions {
  experimentId?: string;
  accessToken?: string;
  /** Current status from store - used to determine if polling should start */
  status?: ExperimentStatus;
  /** Optional custom poll function. If not provided, uses refreshExperimentResult. */
  pollFn?: () => Promise<void>;
  intervalMs?: number;
}

/**
 * Shared hook for polling experiment status while it's in-flight.
 * Usage:
 *   const { refreshExperimentResult } = useApp(); // for manual refresh
 *   useExperimentPolling({ experimentId, accessToken, status });
 *
 *   // Or with custom poll function:
 *   useExperimentPolling({ pollFn: () => fetchDetailsAndUpdate() });
 *
 * The hook automatically:
 * - Starts polling when status is 'queued' or 'running' (or when pollFn is provided without status check)
 * - Stops when status becomes 'completed' or 'failed'
 * - Cleans up on unmount
 */
export function useExperimentPolling({
  experimentId,
  accessToken,
  status,
  pollFn,
  intervalMs = 5000,
}: UseExperimentPollingOptions): { manualRefresh: () => void; isPolling: boolean } {
  const { refreshExperimentResult } = useApp();
  const isPollingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if we should poll based on status (if no pollFn provided)
  const shouldPoll = status === 'queued' || status === 'running';

  // Default poll function uses refreshExperimentResult if no custom pollFn provided
  const defaultPollFn = useCallback(() => {
    if (experimentId && accessToken) {
      return refreshExperimentResult(experimentId);
    }
    return Promise.resolve();
  }, [experimentId, accessToken, refreshExperimentResult]);

  const effectivePollFn = pollFn ?? defaultPollFn;

  const pollOnce = useCallback(() => {
    effectivePollFn();
  }, [effectivePollFn]);

  // Use status check to determine polling (pollFn is just the function to call)
  const shouldStartPolling = shouldPoll;

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
