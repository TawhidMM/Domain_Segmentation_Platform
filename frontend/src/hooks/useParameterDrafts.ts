import { useCallback, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';

/**
 * Custom hook for managing parameter drafts with debouncing
 * Handles dual-layer state: local form state + global AppContext sync
 */
export const useParameterDrafts = (debounceMs: number = 300) => {
  const { parameterDrafts, selectedDatasetIds, focusDatasetId, updateParameterDraft } = useApp();
  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * Resolve parameter value from focused dataset.
   */
  const resolveParameterValue = useCallback(
    (paramKey: string): any => {
      if (!focusDatasetId) return undefined;
      return parameterDrafts[focusDatasetId]?.[paramKey];
    },
    [focusDatasetId, parameterDrafts]
  );

  /**
   * Debounced sync to AppContext
   * Clears previous timer and sets new one
   */
  const debouncedSync = useCallback(
    (datasetIds: string[], paramKey: string, value: any) => {
      // Clear existing timer for this param
      if (debounceTimerRef.current[paramKey]) {
        clearTimeout(debounceTimerRef.current[paramKey]);
      }

      // Set new debounce timer
      debounceTimerRef.current[paramKey] = setTimeout(() => {
        updateParameterDraft(datasetIds, paramKey, value);
        delete debounceTimerRef.current[paramKey];
      }, debounceMs);
    },
    [debounceMs, updateParameterDraft]
  );

  /**
   * Handle parameter change with debounce and broadcast to all selected datasets.
   */
  const handleParameterChange = useCallback(
    (paramKey: string, value: any) => {
      if (selectedDatasetIds.length === 0) return;
      debouncedSync(selectedDatasetIds, paramKey, value);
    },
    [selectedDatasetIds, debouncedSync]
  );

  /**
   * Handle blur event - force sync immediately
   */
  const handleParameterBlur = useCallback(
    (paramKey: string, value: any) => {
      if (selectedDatasetIds.length === 0) return;

      // Cancel any pending debounce
      if (debounceTimerRef.current[paramKey]) {
        clearTimeout(debounceTimerRef.current[paramKey]);
        delete debounceTimerRef.current[paramKey];
      }

      // Immediate sync on blur
      updateParameterDraft(selectedDatasetIds, paramKey, value);
    },
    [selectedDatasetIds, updateParameterDraft]
  );

  /**
   * Memoized value resolution to prevent unnecessary recalculations
   */
  const memoizedResolveParameterValue = useMemo(
    () => resolveParameterValue,
    [resolveParameterValue]
  );

  return {
    parameterDrafts,
    selectedDatasetIds,
    focusDatasetId,
    resolveParameterValue: memoizedResolveParameterValue,
    handleParameterChange,
    handleParameterBlur,
  };
};
