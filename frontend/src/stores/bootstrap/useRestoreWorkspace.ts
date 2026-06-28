import { useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useBootstrapStore } from './bootstrapStore';

export type RestoredWorkspaceMode = 'upload' | 'builder' | 'focus' | undefined;

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

    // If already hydrated synchronously, run immediately
    if (useDatasetStore.persist.hasHydrated() && usePipelineStore.persist.hasHydrated()) {
      run();
    } else {
      setPhase('hydrating');
      // Guard against double fire in edge cases
      onRehydrateRef.current = () => {
        if (useDatasetStore.persist.hasHydrated() && usePipelineStore.persist.hasHydrated() && !ran.current) {
          run();
        }
      };
    }

    return () => {
      unsub1();
      unsub2();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runValidation() {
    try {
      setPhase('validating');

      // Read state AFTER hydration — getState() guarantees fresh values
      const datasetsAfterHydration = useDatasetStore.getState().uploadedDatasets;
      const configAfterHydration = usePipelineStore.getState().configuration;

      // Case 1: No persisted datasets at all
      if (!datasetsAfterHydration || datasetsAfterHydration.length === 0) {
        if (configAfterHydration.selectedTool) {
          resetPipeline();
        }
        setPhase('completed');
        onRestored?.('upload');
        return;
      }

      // Case 2: Validate against backend
      const valid = await validateDatasetsWithBackend(axios);

      if (!valid) {
        resetDatasetState();
        resetPipeline();
        setPhase('completed');
        onRestored?.('upload');
        return;
      }

      const remaining = useDatasetStore.getState().uploadedDatasets;

      if (!remaining || remaining.length === 0) {
        resetPipeline();
        setPhase('completed');
        onRestored?.('upload');
        return;
      }

      // Case 3: Valid datasets survive — determine workspace mode
      setPhase('restoring');

      const pipelineConfig = usePipelineStore.getState().configuration;
      const lastExperiment = usePipelineStore.getState().lastCreatedExperiment;

      // Priority: if there's a created experiment snapshot → focus view
      // If there's pipeline config (tool selected, params configured) → builder
      // Otherwise → upload
      let restoredMode: RestoredWorkspaceMode;
      if (lastExperiment) {
        restoredMode = 'focus';
      } else if (pipelineConfig.selectedTool) {
        restoredMode = 'builder';
      } else {
        restoredMode = 'upload';
      }

      setPhase('completed');
      onRestored?.(restoredMode);
    } catch (err) {
      console.error('[Bootstrap] Workspace restoration failed:', err);
      useBootstrapStore.getState().setError(
        err instanceof Error ? err.message : 'Failed to restore workspace'
      );
      setPhase('failed');
    }
  }
}
