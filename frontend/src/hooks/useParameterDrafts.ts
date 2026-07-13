import { useCallback, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';

/**
 * Custom hook for managing parameter overrides with debouncing
 * Handles dual-layer state: local form state + global AppContext sync
 */
export const useDatasetParamOverrides = (debounceMs: number = 300) => {
  const { datasetParamOverrides, selectedDatasetIds, focusDatasetId, updateDatasetParamOverride } = useApp();
  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * Resolve parameter value from focused dataset.
   */
  const resolveParameterValue = useCallback(
    (paramKey: string): any => {
      if (!focusDatasetId) return undefined;
      return datasetParamOverrides[focusDatasetId]?.[paramKey];
    },
    [focusDatasetId, datasetParamOverrides]
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
        updateDatasetParamOverride(datasetIds, paramKey, value);
        delete debounceTimerRef.current[paramKey];
      }, debounceMs);
    },
    [debounceMs, updateDatasetParamOverride]
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
      updateDatasetParamOverride(selectedDatasetIds, paramKey, value);
    },
    [selectedDatasetIds, updateDatasetParamOverride]
  );

  /**
   * Memoized value resolution to prevent unnecessary recalculations
   */
  const memoizedResolveParameterValue = useMemo(
    () => resolveParameterValue,
    [resolveParameterValue]
  );

  return {
    datasetParamOverrides,
    selectedDatasetIds,
    focusDatasetId,
    resolveParameterValue: memoizedResolveParameterValue,
    handleParameterChange,
    handleParameterBlur,
  };
};
