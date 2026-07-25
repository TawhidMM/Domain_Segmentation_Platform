import { useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useImportResultsStore } from '@/stores/import-results';
import { useUIStore } from '@/store/useUIStore';
import { useBootstrapStore } from './bootstrapStore';

export type RestoredWorkspaceMode = 'upload' | 'builder' | 'focus' | 'comparison' | undefined;

/**
 * Singleton workspace restoration hook.
 *
 * This is the ONLY place that decides where the user resumes after a browser
 * refresh. No component should independently try to restore state.
 *
 * Startup sequence:
 *   1. Wait for Zustand persist rehydration
 *   2. Validate persisted dataset IDs against backend
 *   3. Prune invalid / expired datasets
 *   4. Determine workspace mode based on surviving state
 *   5. Call onRestored(mode) so consumers (AppContext) can switch to the right view
 */
export function useRestoreWorkspace(onRestored?: (mode: RestoredWorkspaceMode) => void) {
  const ran = useRef(false);

  const setPhase = useBootstrapStore((s) => s.setPhase);

  // IMPORTANT: Do NOT capture store selectors in the closure for runValidation().
  // The store values change after hydration. Always use getState() inside runValidation.
  const validateDatasetsWithBackend = useDatasetStore((s) => s.validateDatasetsWithBackend);
  const resetDatasetState = useDatasetStore((s) => s.resetDatasetState);
  const resetPipeline = usePipelineStore((s) => s.resetPipeline);

  const onRehydrateRef = useRef<(() => void) | null>(null);

  // --- Step 1: wait for persist rehydration of both stores ---
  useEffect(() => {
    const run = () => {
      ran.current = true;
      setPhase('validating');
      void runValidation();
    };

    const unsub1 = useDatasetStore.persist.onFinishHydration(run);
    const unsub2 = usePipelineStore.persist.onFinishHydration(run);
    const unsub3 = useImportResultsStore.persist.onFinishHydration(run);

    // If already hydrated synchronously, run immediately
    if (useDatasetStore.persist.hasHydrated() && usePipelineStore.persist.hasHydrated() && useImportResultsStore.persist.hasHydrated()) {
      run();
    } else {
      setPhase('hydrating');
      // Guard against double fire in edge cases
      onRehydrateRef.current = () => {
        if (useDatasetStore.persist.hasHydrated() && usePipelineStore.persist.hasHydrated() && useImportResultsStore.persist.hasHydrated() && !ran.current) {
          run();
        }
      };
    }

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  async function runValidation() {
    try {
      setPhase('validating');

      const datasetsAfterHydration = useDatasetStore.getState().datasets.filter((d) => d.status === 'SUCCESS');

      if (!datasetsAfterHydration || datasetsAfterHydration.length === 0) {
        resetPipeline();
        setPhase('completed');
        onRestored?.('upload');
        return;
      }

      const valid = await validateDatasetsWithBackend();

      if (!valid) {
        resetDatasetState();
        resetPipeline();
        useImportResultsStore.getState().resetImportResults();
        useUIStore.getState().resetUIState();
        setPhase('completed');
        onRestored?.('upload');
        return;
      }

      const remaining = useDatasetStore.getState().datasets.filter((d) => d.status === 'SUCCESS');

      if (!remaining || remaining.length === 0) {
        resetPipeline();
        useImportResultsStore.getState().resetImportResults();
        useUIStore.getState().resetUIState();
        setPhase('completed');
        onRestored?.('upload');
        return;
      }

      setPhase('restoring');

      // Read the rehydrated store mode directly out of the UI store
      const rehydratedMode = useUIStore.getState().currentView;
      const lastExperiment = usePipelineStore.getState().lastCreatedExperiment;

      await useImportResultsStore.getState().validateStagedItems();

      let restoredMode: RestoredWorkspaceMode;
      if (rehydratedMode === 'focus') {
        // Integrity check: only allow 'focus' layout if the snapshot database records match up
        if (lastExperiment) {
          restoredMode = 'focus';
        } else {
          // Self-healing fallback: snapshot data missing, break out of layout lock
          useUIStore.getState().setWorkspaceView('builder');
          restoredMode = 'builder';
        }
      } else {
        // Explicitly preserves 'builder' or 'upload' views matching exactly where they refreshed
        restoredMode = rehydratedMode;
      }

      setPhase('completed');
      onRestored?.(restoredMode);
    } catch (err) {
      console.error('[Bootstrap] Workspace restoration failed:', err);
      resetDatasetState();
      resetPipeline();
      useImportResultsStore.getState().resetImportResults();
      useUIStore.getState().resetUIState();
      useBootstrapStore.getState().setError(
        err instanceof Error ? err.message : 'Failed to restore workspace'
      );
      setPhase('failed');
    }
  }
}