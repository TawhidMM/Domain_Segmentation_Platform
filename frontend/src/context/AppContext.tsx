import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { WorkspaceMode, ExperimentSubmitResponse } from '@/types';
import { fetchExperimentDetails, fetchExperimentMetrics, fetchExperimentResult } from '@/services/experimentService';
import axios from '@/lib/axios';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useExperimentsStore } from '@/stores/experiments';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import {useImportResultsStore} from "@/stores/import-results";

const TOOL_WORKFLOW_STORAGE_KEY = 'select-tool-workflow-state-v1';
const BUILDER_STATE_STORAGE_KEY = 'experiment-builder-state-v1';

interface JobRedirectInfo {
  experimentId: string;
  accessToken: string;
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
  datasetAnnotationMap: Record<string, string>;
  successfulDatasets: import('@/types').DatasetItem[];
  updateDatasetParamOverride: (datasetIds: string[], paramKey: string, value: any) => void;
  setSelectedDatasetIds: (ids: string[]) => void;
  setFocusDatasetId: (id: string | null) => void;
  resetDatasetParamOverrides: () => void;
  setDatasetAnnotation: (datasetId: string, annotationId: string) => void;
  clearDatasetAnnotation: (datasetId: string) => void;

  // Submit action
  submitExperiments: (email: string) => Promise<JobRedirectInfo | null>;
  refreshExperimentResult: (experimentId: string) => Promise<void>;
  toggleComparisonExperiment: (id: string) => void;
  clearComparisonExperiments: () => void;

  // Workspace actions
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  startNewExperiment: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Experiments now come directly from pipeline store (persistent source of truth)
  const experiments = useExperimentsStore((state) => state.experiments);
  const activeExperimentId = useExperimentsStore((state) => state.activeExperimentId);
  const removeExperimentFromStore = useExperimentsStore((state) => state.removeExperiment);
  const setActiveExperimentInStore = useExperimentsStore((state) => state.setActiveExperiment);

  const [, setWorkspaceMode] = useState<WorkspaceMode>('upload');
  const [, setComparisonExperimentIds] = useState<string[]>([]);

  // Multi-dataset parameter management
  const [datasetParamOverrides, setDatasetParamOverrides] = useState<Record<string, Record<string, any>>>({});
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [focusDatasetId, setFocusDatasetId] = useState<string | null>(null);
  const [datasetAnnotationMap, setDatasetAnnotationMap] = useState<Record<string, string>>({});
  const successfulDatasets = useDatasetStore(
    useShallow((state) => state.datasets.filter((d) => d.status === 'SUCCESS'))
  );

  const submitExperiments = useCallback(async (email: string): Promise<JobRedirectInfo | null> => {
    if (successfulDatasets.length === 0) {
      console.error('No datasets available. Please upload datasets first.');
      return null;
    }

    const currentExperiments = useExperimentsStore.getState().experiments;
    const unsubmittedExperiments = currentExperiments.filter((e) => e.status === 'not-submitted');

    if (unsubmittedExperiments.length === 0) {
      console.log('No experiments to submit');
      return null;
    }

    // Update status to queued
    useExperimentsStore.setState((prev) => ({
      experiments: prev.experiments.map((e) =>
        e.status === 'not-submitted' ? { ...e, status: 'queued' as import('@/types').ExperimentStatus } : e
      ),
    }));

    let firstJobRedirect: JobRedirectInfo | null = null;

    // Submit each experiment to backend
    for (const exp of unsubmittedExperiments) {
      try {
        const datasetIds = exp.datasetIds.length > 0
          ? exp.datasetIds
          : successfulDatasets.map((item) => item.datasetId!).filter(Boolean);

        // Build per-dataset configs: use draft config if available, otherwise fall back to global
        // Also store dataset-specific params in datasetParams
        const datasetConfigs = datasetIds.map((datasetId) => ({
          dataset_id: datasetId,
          params: datasetParamOverrides[datasetId] ?? exp.parameters,
          annotation_id: datasetAnnotationMap[datasetId] ?? undefined,
        }));

        const response = await axios.post('/experiments/submit', {
          dataset_configs: datasetConfigs,
          tool_name: exp.toolId,
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
                  status: 'queued' as import('@/types').ExperimentStatus,
                  experimentId: experimentId,
                  accessToken,
                  result: null,
                  metrics: null,
                  datasetParams: datasetParamsMap,
                }
              : e
          ),
        }));
      } catch (error) {
        console.error(`Failed to submit experiment ${exp.id}:`, error);
        // Mark as failed
        useExperimentsStore.setState((prev) => ({
          experiments: prev.experiments.map((e) =>
            e.id === exp.id ? { ...e, status: 'not-submitted' as import('@/types').ExperimentStatus } : e
          ),
        }));
      }
    }

    return firstJobRedirect;
  }, [datasetAnnotationMap, successfulDatasets, datasetParamOverrides]);

  const refreshExperimentResult = useCallback(
    async (experimentId: string) => {
      const currentExperiments = useExperimentsStore.getState().experiments;
      const target = currentExperiments.find((e) => e.id === experimentId);
      if (!target?.experimentId || !target.accessToken) {
        console.error('No experiment id or access token found for experiment');
        return;
      }

      try {
        const experimentDetails = await fetchExperimentDetails(target.experimentId, target.accessToken);
        const finishedRunId = experimentDetails.datasets
          .flatMap((dataset) => dataset.runs)
          .find((run) => run.status === 'finished')?.run_id;

        if (!finishedRunId) {
          console.error(`No finished run found for experiment ${experimentId}`);
          return;
        }

        const result = await fetchExperimentResult(finishedRunId, target.accessToken);
        let metrics = null;
        try {
          metrics = await fetchExperimentMetrics(finishedRunId, target.accessToken);
        } catch (metricsError) {
          console.error(`Failed to fetch metrics for experiment ${experimentId}:`, metricsError);
        }
        useExperimentsStore.setState((prev) => ({
          experiments: prev.experiments.map((e) =>
            e.id === experimentId
              ? {
                  ...e,
                  status: 'completed' as import('@/types').ExperimentStatus,
                  completedAt: new Date(),
                  result: { ...result, experimentId: target.experimentId },
                  metrics,
                }
              : e
          ),
        }));
      } catch (error) {
        // If result not ready (404), keep current status
        console.error(`Failed to fetch result for experiment ${experimentId}:`, error);
      }
    },
    []
  );

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
    setDatasetAnnotationMap({});
    // Use resetBuilderState to preserve already-created experiments, only reset builder state
    usePipelineStore.getState().resetBuilderState();
    useImportResultsStore.getState().resetImportResults();
    useUIStore.getState().setWorkspaceView('builder');
    useUIStore.getState().setWorkspaceTab('pipeline');
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
    setDatasetAnnotationMap({});
  }, []);

  const setDatasetAnnotation = useCallback((datasetId: string, annotationId: string) => {
    if (!datasetId || !annotationId) {
      return;
    }

    setDatasetAnnotationMap((prev) => ({
      ...prev,
      [datasetId]: annotationId,
    }));
  }, []);

  const clearDatasetAnnotation = useCallback((datasetId: string) => {
    if (!datasetId) {
      return;
    }

    setDatasetAnnotationMap((prev) => {
      if (!prev[datasetId]) {
        return prev;
      }

      const copy = { ...prev };
      delete copy[datasetId];
      return copy;
    });
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
        datasetAnnotationMap,
        submitExperiments,
        refreshExperimentResult,
        toggleComparisonExperiment,
        clearComparisonExperiments,
        setWorkspaceMode,
        startNewExperiment,
        updateDatasetParamOverride,
        setSelectedDatasetIds,
        setFocusDatasetId,
        resetDatasetParamOverrides,
        setDatasetAnnotation,
        clearDatasetAnnotation,
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