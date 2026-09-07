import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { WorkspaceView, WorkspaceTab, ExperimentSubmitResponse, ExperimentStatus, DatasetUploadStatus } from '@/types';
import axios from '@/lib/axios';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useExperimentsStore } from '@/stores/experiments';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import {useImportResultsStore} from "@/stores/import-results";
import { isExperimentReadyToSubmit, SkippedExperiment } from '@/utils/annotationStatus';

const TOOL_WORKFLOW_STORAGE_KEY = 'select-tool-workflow-state-v1';
const BUILDER_STATE_STORAGE_KEY = 'experiment-builder-state-v1';

interface JobRedirectInfo {
  experimentId: string;
  accessToken: string;
}

interface SubmitSkipResult {
  redirectInfo: JobRedirectInfo | null;
  submittedCount: number;
  skipped: SkippedExperiment[];
}

interface AppContextType {
  experiments: import('@/types').Experiment[];
  activeExperimentId: string | null;

  // Experiment actions - passthrough to pipeline store
  setActiveExperiment: (id: string | null) => void;
  removeExperiment: (id: string) => void;

  // Multi-dataset parameter management
  datasetParamOverrides: Record<string, Record<string, any>>;
  selectedDatasetIds: string[];
  focusDatasetId: string | null;
  successfulDatasets: import('@/types').DatasetItem[];
  updateDatasetParamOverride: (datasetIds: string[], paramKey: string, value: any) => void;
  setSelectedDatasetIds: (ids: string[]) => void;
  setFocusDatasetId: (id: string | null) => void;
  resetDatasetParamOverrides: () => void;

  // Submit action
  submitExperiments: (email: string) => Promise<SubmitSkipResult>;
  toggleComparisonExperiment: (id: string) => void;
  clearComparisonExperiments: () => void;

  // Workspace actions
  startNewExperiment: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Experiments now come directly from pipeline store (persistent source of truth)
  const experiments = useExperimentsStore((state) => state.experiments);
  const activeExperimentId = useExperimentsStore((state) => state.activeExperimentId);
  const removeExperimentFromStore = useExperimentsStore((state) => state.removeExperiment);
  const setActiveExperimentInStore = useExperimentsStore((state) => state.setActiveExperiment);

  const [, setComparisonExperimentIds] = useState<string[]>([]);

  // Multi-dataset parameter management
  const [datasetParamOverrides, setDatasetParamOverrides] = useState<Record<string, Record<string, any>>>({});
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [focusDatasetId, setFocusDatasetId] = useState<string | null>(null);
  const successfulDatasets = useDatasetStore(
    useShallow((state) => state.datasets.filter((d) => d.status === DatasetUploadStatus.SUCCESS))
  );

  const submitExperiments = useCallback(async (email: string): Promise<SubmitSkipResult> => {
    if (successfulDatasets.length === 0) {
      console.error('No datasets available. Please upload datasets first.');
      return { redirectInfo: null, submittedCount: 0, skipped: [] };
    }

    const currentExperiments = useExperimentsStore.getState().experiments;
    const unsubmittedExperiments = currentExperiments.filter((e) => e.status === ExperimentStatus.NOT_SUBMITTED);

    if (unsubmittedExperiments.length === 0) {
      console.log('No experiments to submit');
      return { redirectInfo: null, submittedCount: 0, skipped: [] };
    }

    const skipped: SkippedExperiment[] = [];
    const ready: typeof unsubmittedExperiments = [];

    for (const exp of unsubmittedExperiments) {
      if (!isExperimentReadyToSubmit(exp)) {
        const reason = exp.datasetIds.length === 0
          ? 'No datasets selected'
          : 'Missing required manual annotation for one or more datasets';
        skipped.push({ id: exp.id, experimentName: exp.experimentName ?? exp.experimentName, reason });
        continue;
      }
      ready.push(exp);
    }

    if (ready.length === 0) {
      return { redirectInfo: null, submittedCount: 0, skipped };
    }

    // Update status to queued for ready experiments only
    useExperimentsStore.setState((prev) => ({
      experiments: prev.experiments.map((e) =>
        ready.some((r) => r.id === e.id) ? { ...e, status: ExperimentStatus.QUEUED } : e
      ),
    }));

    let firstJobRedirect: JobRedirectInfo | null = null;
    let submittedCount = 0;

    // Submit each ready experiment to backend
    for (const exp of ready) {
      try {
        const datasetIds = exp.datasetIds.length > 0
          ? exp.datasetIds
          : successfulDatasets.map((item) => item.datasetId!).filter(Boolean);

        // Build per-dataset configs: use draft config if available, otherwise fall back to global
        // Also store dataset-specific params in datasetParams
        const datasetConfigs = datasetIds.map((datasetId) => ({
          dataset_id: datasetId,
          params: datasetParamOverrides[datasetId] ?? exp.parameters,
          annotation_id: exp.annotationIds?.[datasetId] ?? undefined,
        }));

        const response = await axios.post('/experiments/submit', {
          dataset_configs: datasetConfigs,
          tool_id: exp.toolId,
          experiment_name: exp.experimentName,
          seed_list: exp.seedList
        });

        const submitResponse = response.data as ExperimentSubmitResponse;
        const experimentId = submitResponse.experiment_id;
        const accessToken = submitResponse.access_token;

        console.log(`Experiment ${exp.id} submitted with experiment_id: ${experimentId}`);

        // Store redirect info from first submission
        if (!firstJobRedirect) {
          firstJobRedirect = { experimentId, accessToken };
        }

        // Build datasetParams map for this experiment
        const datasetParamsMap: Record<string, Record<string, unknown>> = {};
        datasetIds.forEach((datasetId) => {
          if (datasetParamOverrides[datasetId]) {
            datasetParamsMap[datasetId] = datasetParamOverrides[datasetId];
          }
        });

        // Fill run IDs using the store action
        useExperimentsStore.getState().fillRunIds(exp.id, submitResponse.runs_by_dataset);

        // Update experiment with additional metadata
        useExperimentsStore.setState((prev) => ({
          experiments: prev.experiments.map((e) =>
            e.id === exp.id
              ? {
                  ...e,
                  status: ExperimentStatus.QUEUED,
                  experimentId: experimentId,
                  accessToken,
                  result: null,
                  metrics: null,
                  datasetParams: datasetParamsMap,
                }
              : e
          ),
        }));

        submittedCount += 1;
      } catch (error) {
        console.error(`Failed to submit experiment ${exp.id}:`, error);
        // Mark as failed
        useExperimentsStore.setState((prev) => ({
          experiments: prev.experiments.map((e) =>
            e.id === exp.id ? { ...e, status: ExperimentStatus.NOT_SUBMITTED } : e
          ),
        }));
      }
    }

    return { redirectInfo: firstJobRedirect, submittedCount, skipped };
  }, [successfulDatasets, datasetParamOverrides]);

  const toggleComparisonExperiment = useCallback((id: string) => {
    setComparisonExperimentIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((expId) => expId !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const clearComparisonExperiments = useCallback(() => {
    setComparisonExperimentIds([]);
  }, []);

  const startNewExperiment = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(BUILDER_STATE_STORAGE_KEY);
      window.sessionStorage.removeItem(TOOL_WORKFLOW_STORAGE_KEY);
    }

    setDatasetParamOverrides({});
    setSelectedDatasetIds([]);
    setFocusDatasetId(null);
    // Use resetBuilderState to preserve already-created experiments, only reset builder state
    usePipelineStore.getState().resetBuilderState();
    useImportResultsStore.getState().resetImportResults();
    useUIStore.getState().setWorkspaceView(WorkspaceView.BUILDER);
    useUIStore.getState().setWorkspaceTab(WorkspaceTab.PIPELINE);
  }, []);

  // Multi-dataset parameter management callbacks
  const updateDatasetParamOverride = useCallback((datasetIds: string[], paramKey: string, value: any) => {
    setDatasetParamOverrides((prev) => {
      const updated = { ...prev };
      datasetIds.forEach((datasetId) => {
        if (!updated[datasetId]) {
          updated[datasetId] = {};
        }
        updated[datasetId] = { ...updated[datasetId], [paramKey]: value };
      });
      return updated;
    });
  }, []);

  const resetDatasetParamOverrides = useCallback(() => {
    setDatasetParamOverrides({});
    setSelectedDatasetIds([]);
    setFocusDatasetId(null);
  }, []);

  // Experiment action passthroughs to pipeline store
  const setActiveExperiment = useCallback((id: string | null) => {
    setActiveExperimentInStore(id);
  }, [setActiveExperimentInStore]);

  const removeExperiment = useCallback((id: string) => {
    removeExperimentFromStore(id);
    setComparisonExperimentIds((prev) => prev.filter((expId) => expId !== id));
  }, [removeExperimentFromStore]);

  return (
    <AppContext.Provider
      value={{
        successfulDatasets,
        experiments,
        activeExperimentId,
        setActiveExperiment,
        removeExperiment,
        datasetParamOverrides,
        selectedDatasetIds,
        focusDatasetId,
        submitExperiments,
        toggleComparisonExperiment,
        clearComparisonExperiments,
        startNewExperiment,
        updateDatasetParamOverride,
        setSelectedDatasetIds,
        setFocusDatasetId,
        resetDatasetParamOverrides,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};