import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Experiment, WorkspaceMode, ExperimentStatus, ParameterValue, JobSubmissionResponse, ToolRequirements } from '@/types';
import { fetchExperimentDetails, fetchExperimentMetrics, fetchExperimentResult } from '@/services/experimentService';
import axios from '@/lib/axios';
import { useDatasetStore } from '@/stores/dataset';

const TOOL_WORKFLOW_STORAGE_KEY = 'select-tool-workflow-state-v1';
const BUILDER_STATE_STORAGE_KEY = 'experiment-builder-state-v1';

interface JobRedirectInfo {
  experimentId: string;
  accessToken: string;
}

interface AppContextType {
  experiments: Experiment[];
  activeExperimentId: string | null;
  workspaceMode: WorkspaceMode;
  comparisonExperimentIds: string[];
  
  // Multi-dataset parameter management
  parameterDrafts: Record<string, Record<string, any>>;
  selectedDatasetIds: string[];
  focusDatasetId: string | null;
  datasetAnnotationMap: Record<string, string>;
  successfulDatasets: import('@/stores/dataset').UploadedDataset[];
  updateParameterDraft: (datasetIds: string[], paramKey: string, value: any) => void;
  setSelectedDatasetIds: (ids: string[]) => void;
  setFocusDatasetId: (id: string | null) => void;
  resetParameterDrafts: () => void;
  setDatasetAnnotation: (datasetId: string, annotationId: string) => void;
  clearDatasetAnnotation: (datasetId: string) => void;
  
  // Experiment actions
  createExperiment: (toolId: string, parameters: Record<string, unknown>, toolLabel?: string, numberOfRuns?: number, datasetIds?: string[], requirements?: ToolRequirements) => void;
  setActiveExperiment: (id: string | null) => void;
  removeExperiment: (id: string) => void;
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
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('upload');
  const [comparisonExperimentIds, setComparisonExperimentIds] = useState<string[]>([]);
  
  // Multi-dataset parameter management
  const [parameterDrafts, setParameterDrafts] = useState<Record<string, Record<string, any>>>({});
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [focusDatasetId, setFocusDatasetId] = useState<string | null>(null);
  const [datasetAnnotationMap, setDatasetAnnotationMap] = useState<Record<string, string>>({});
  const successfulDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const createExperiment = useCallback((
    toolId: string,
    parameters: ParameterValue,
    toolLabel: string,
    numberOfRuns: number = 1,
    datasetIds: string[] = [],
    requirements?: ToolRequirements,
  ) => {
    const experiment: Experiment = {
      id: crypto.randomUUID(),
      toolId,
      toolName: toolLabel,
      datasetIds,
      requirements,
      parameters,
      numberOfRuns,
      status: 'not-submitted',
      createdAt: new Date(),
      completedAt: null,
      result: null,
      metrics: null,
    };

    setExperiments((prev) => [...prev, experiment]);
    setActiveExperimentId(experiment.id);
    setWorkspaceMode('focus');
  }, []);

  const setActiveExperiment = useCallback((id: string | null) => {
    setActiveExperimentId(id);
    if (id) {
      setWorkspaceMode('focus');
    }
  }, []);

  const removeExperiment = useCallback((id: string) => {
    setExperiments((prev) => {
      const nextExperiments = prev.filter((experiment) => experiment.id !== id);
      setActiveExperimentId((currentActiveId) => (
        currentActiveId === id ? nextExperiments[0]?.id ?? null : currentActiveId
      ));
      return nextExperiments;
    });
    setComparisonExperimentIds((prev) => prev.filter((experimentId) => experimentId !== id));
  }, []);

  const submitExperiments = useCallback(async (email: string): Promise<JobRedirectInfo | null> => {
    if (successfulDatasets.length === 0) {
      console.error('No datasets available. Please upload datasets first.');
      return null;
    }

    const unsubmittedExperiments = experiments.filter((e) => e.status === 'not-submitted');
    
    if (unsubmittedExperiments.length === 0) {
      console.log('No experiments to submit');
      return null;
    }

    // Update status to queued
    setExperiments((prev) =>
      prev.map((e) =>
        e.status === 'not-submitted' ? { ...e, status: 'queued' as ExperimentStatus } : e
      )
    );

    let firstJobRedirect: JobRedirectInfo | null = null;

    // Submit each experiment to backend
    for (const exp of unsubmittedExperiments) {
      try {
        const datasetIds = exp.datasetIds.length > 0
          ? exp.datasetIds
          : successfulDatasets.map((item) => item.datasetId!).filter(Boolean);

        // Build per-dataset configs: use draft config if available, otherwise fall back to global
        const datasetConfigs = datasetIds.map((datasetId) => ({
          dataset_id: datasetId,
          params: parameterDrafts[datasetId] ?? exp.parameters,
          annotation_id: datasetAnnotationMap[datasetId] ?? undefined,
        }));

        const response = await axios.post('/experiments/submit', {
          dataset_configs: datasetConfigs,
          tool_name: exp.toolId,
          number_of_runs: exp.numberOfRuns ?? 1
        });

        const jobSubmissionResponse = response.data as JobSubmissionResponse;
        const experimentId = jobSubmissionResponse.experiment_id;
        const accessToken = jobSubmissionResponse.access_token;
        
        console.log(`Experiment ${exp.id} submitted with experiment_id: ${experimentId}`);

        // Store redirect info from first submission
        if (!firstJobRedirect) {
          firstJobRedirect = { experimentId, accessToken };
        }

        // Update experiment with experimentId and queued status
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === exp.id
              ? {
                  ...e,
                  status: 'queued' as ExperimentStatus,
                  jobId: experimentId,
                  accessToken,
                  result: null,
                  metrics: null,
                }
              : e
          )
        );
      } catch (error) {
        console.error(`Failed to submit experiment ${exp.id}:`, error);
        // Mark as failed
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === exp.id ? { ...e, status: 'not-submitted' as ExperimentStatus } : e
          )
        );
      }
    }

    return firstJobRedirect;
  }, [datasetAnnotationMap, experiments, successfulDatasets, parameterDrafts]);

  const refreshExperimentResult = useCallback(
    async (experimentId: string) => {
      const target = experiments.find((e) => e.id === experimentId);
      if (!target?.jobId || !target.accessToken) {
        console.error('No experiment id or access token found for experiment');
        return;
      }

      try {
        const experimentDetails = await fetchExperimentDetails(target.jobId, target.accessToken);
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
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === experimentId
              ? {
                  ...e,
                  status: 'completed' as ExperimentStatus,
                  completedAt: new Date(),
                  result: { ...result, jobId: target.jobId },
                  metrics,
                }
              : e
          )
        );
      } catch (error) {
        // If result not ready (404), keep current status
        console.error(`Failed to fetch result for experiment ${experimentId}:`, error);
      }
    },
    [experiments]
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
    setParameterDrafts({});
    setSelectedDatasetIds([]);
    setFocusDatasetId(null);
    setDatasetAnnotationMap({});
    setWorkspaceMode('builder');
    setActiveExperimentId(null);
  }, []);

  // Multi-dataset parameter management callbacks
  const updateParameterDraft = useCallback((datasetIds: string[], paramKey: string, value: any) => {
    setParameterDrafts((prev) => {
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

  const resetParameterDrafts = useCallback(() => {
    setParameterDrafts({});
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

  return (
    <AppContext.Provider
      value={{
        successfulDatasets,
        experiments,
        activeExperimentId,
        workspaceMode,
        comparisonExperimentIds,
        parameterDrafts,
        selectedDatasetIds,
        focusDatasetId,
        datasetAnnotationMap,
        createExperiment,
        setActiveExperiment,
        removeExperiment,
        submitExperiments,
        refreshExperimentResult,
        toggleComparisonExperiment,
        clearComparisonExperiments,
        setWorkspaceMode,
        startNewExperiment,
        updateParameterDraft,
        setSelectedDatasetIds,
        setFocusDatasetId,
        resetParameterDrafts,
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
