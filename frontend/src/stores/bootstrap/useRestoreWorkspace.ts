import { useEffect, useRef } from 'react';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useImportResultsStore } from '@/stores/import-results';
import { useExperimentsStore } from '@/stores/experiments';
import { useComparisonStore } from '@/stores/comparison';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import { useBootstrapStore } from './bootstrapStore';
import { BootstrapPhase, DatasetUploadStatus, WorkspaceView } from '@/types';

export type RestoredWorkspaceMode = WorkspaceView | undefined;

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
 *   4. Validate experiments against backend (remove stale submitted + unsubmitted referencing expired datasets)
 *   5. Cascade cleanup for comparison basket and pipeline editing state
 *   6. Validate staged import results
 *   7. Determine workspace mode based on surviving state
 *   8. Call onRestored(mode) so consumers (AppContext) can switch to the right view
 */
export function useRestoreWorkspace(onRestored?: (mode: RestoredWorkspaceMode) => void) {
  const ran = useRef(false);

  const setPhase = useBootstrapStore((s) => s.setPhase);


  const validateDatasetsWithBackend = useDatasetStore((s) => s.validateDatasetsWithBackend);
  const validateExperimentsWithBackend = useExperimentsStore((s) => s.validateExperimentsWithBackend);
  const resetDatasetState = useDatasetStore((s) => s.resetDatasetState);
  const resetPipeline = usePipelineStore((s) => s.resetPipeline);

  const onRehydrateRef = useRef<(() => void) | null>(null);

  // --- Step 1: wait for persist rehydration of all stores ---
  useEffect(() => {
    const run = () => {
      ran.current = true;
      setPhase(BootstrapPhase.VALIDATING);
      void runValidation();
    };

    const unsub1 = useDatasetStore.persist.onFinishHydration(run);
    const unsub2 = usePipelineStore.persist.onFinishHydration(run);
    const unsub3 = useImportResultsStore.persist.onFinishHydration(run);
    const unsub4 = useExperimentsStore.persist.onFinishHydration(run);
    const unsub5 = useComparisonStore.persist.onFinishHydration(run);

    // If already hydrated synchronously, run immediately
    if (
      useDatasetStore.persist.hasHydrated() &&
      usePipelineStore.persist.hasHydrated() &&
      useImportResultsStore.persist.hasHydrated() &&
      useExperimentsStore.persist.hasHydrated() &&
      useComparisonStore.persist.hasHydrated()
    ) {
      run();
    } else {
      setPhase(BootstrapPhase.HYDRATING);
      // Guard against double fire in edge cases
      onRehydrateRef.current = () => {
        if (
          useDatasetStore.persist.hasHydrated() &&
          usePipelineStore.persist.hasHydrated() &&
          useImportResultsStore.persist.hasHydrated() &&
          useExperimentsStore.persist.hasHydrated() &&
          useComparisonStore.persist.hasHydrated() &&
          !ran.current
        ) {
          run();
        }
      };
    }

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, []);

  async function runValidation() {
    try {
      setPhase(BootstrapPhase.VALIDATING);

      const datasetsAfterHydration = useDatasetStore.getState().datasets.filter((d) => d.status === DatasetUploadStatus.SUCCESS);

      if (!datasetsAfterHydration || datasetsAfterHydration.length === 0) {
        resetPipeline();
        useExperimentsStore.getState().resetExperiments();
        useComparisonStore.getState().clear();
        setPhase(BootstrapPhase.COMPLETED);
        onRestored?.(WorkspaceView.UPLOAD);
        return;
      }

      const valid = await validateDatasetsWithBackend();

      if (!valid) {
        resetDatasetState();
        resetPipeline();
        useExperimentsStore.getState().resetExperiments();
        useComparisonStore.getState().clear();
        useImportResultsStore.getState().resetImportResults();
        useUIStore.getState().resetUIState();
        setPhase(BootstrapPhase.COMPLETED);
        onRestored?.(WorkspaceView.UPLOAD);
        return;
      }

      const remaining = useDatasetStore.getState().datasets.filter((d) => d.status === DatasetUploadStatus.SUCCESS);

      if (!remaining || remaining.length === 0) {
        resetPipeline();
        useExperimentsStore.getState().resetExperiments();
        useComparisonStore.getState().clear();
        useImportResultsStore.getState().resetImportResults();
        useUIStore.getState().resetUIState();
        setPhase(BootstrapPhase.COMPLETED);
        onRestored?.(WorkspaceView.UPLOAD);
        return;
      }

      setPhase(BootstrapPhase.RESTORING);

      // Validate experiments against backend
      const experimentValidation = await validateExperimentsWithBackend();
      const validDatasetIds = new Set(useDatasetStore.getState().datasets.filter((d) => d.status === DatasetUploadStatus.SUCCESS).map((d) => d.datasetId));

      if (experimentValidation.removedSubmitted > 0 || experimentValidation.removedUnsubmitted > 0) {
        const parts: string[] = [];
        if (experimentValidation.removedSubmitted > 0) parts.push(`${experimentValidation.removedSubmitted} submitted experiment(s)`);
        if (experimentValidation.removedUnsubmitted > 0) parts.push(`${experimentValidation.removedUnsubmitted} unsubmitted experiment(s)`);
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(
            `${parts.join(' and ')} have been removed because they are no longer available on the server or reference expired datasets. Your workspace has been updated.`
          );
        }

        // Cascade: clean up comparison basket entries pointing to removed experiments
        const survivingExperiments = useExperimentsStore.getState().experiments;
        useComparisonStore.getState().pruneNotIn(survivingExperiments.map((e) => e.id));

        // Cascade: clear pipeline editingExperimentId if it references a removed experiment
        const pipeline = usePipelineStore.getState();
        if (pipeline.editingExperimentId && !survivingExperiments.some((e) => e.id === pipeline.editingExperimentId)) {
          usePipelineStore.setState((prev) => ({ ...prev, editingExperimentId: null }));
        }

        // Cascade: if UI is locked in focus mode but lastCreatedExperiment references pruned datasets, fall back to builder
        const rehydratedMode = useUIStore.getState().currentView;
        const lastExperiment = pipeline.lastCreatedExperiment;
        if (rehydratedMode === WorkspaceView.FOCUS && lastExperiment) {
          const hasPrunedDataset = lastExperiment.datasetIds.some((id) => !validDatasetIds.has(id));
          if (hasPrunedDataset) {
            useUIStore.getState().setWorkspaceView(WorkspaceView.BUILDER);
          }
        }
      }

      // Read the rehydrated store mode directly out of the UI store
      const rehydratedMode = useUIStore.getState().currentView;
      const lastExperiment = usePipelineStore.getState().lastCreatedExperiment;

      await useImportResultsStore.getState().validateStagedItems();

      let restoredMode: RestoredWorkspaceMode;
      if (rehydratedMode === WorkspaceView.FOCUS) {
        // Integrity check: only allow 'focus' layout if the snapshot database records match up
        if (lastExperiment) {
          restoredMode = WorkspaceView.FOCUS;
        } else {
          // Self-healing fallback: snapshot data missing, break out of layout lock
          useUIStore.getState().setWorkspaceView(WorkspaceView.BUILDER);
          restoredMode = WorkspaceView.BUILDER;
        }
      } else {
        // Explicitly preserves 'builder' or 'upload' views matching exactly where they refreshed
        restoredMode = rehydratedMode;
      }

      // Final safety: if focus mode was requested but there are no surviving experiments, force builder
      if (restoredMode === WorkspaceView.FOCUS) {
        const hasAnyExperiment = useExperimentsStore.getState().experiments.length > 0;
        if (!hasAnyExperiment) {
          useUIStore.getState().setWorkspaceView(WorkspaceView.UPLOAD);
          restoredMode = WorkspaceView.UPLOAD;
        }
      }

      setPhase(BootstrapPhase.COMPLETED);
      onRestored?.(restoredMode);
    } catch (err) {
      console.error('[Bootstrap] Workspace restoration failed:', err);
      resetDatasetState();
      resetPipeline();
      useExperimentsStore.getState().resetExperiments();
      useImportResultsStore.getState().resetImportResults();
      useUIStore.getState().resetUIState();
      useBootstrapStore.getState().setError(
        err instanceof Error ? err.message : 'Failed to restore workspace'
      );
      setPhase(BootstrapPhase.FAILED);
    }
  }
}