import React, { createContext, useContext, useState, useCallback, useRef, useMemo, ReactNode } from 'react';
import { Dataset, DatasetUploadQueueItem, Experiment, WorkspaceMode, ExperimentStatus, ParameterValue, JobSubmissionResponse, ToolRequirements } from '@/types';
import { generateMockDatasetSummary } from '@/data/mockData';
import { uploadGeneExpressionFile } from '@/services/uploadService';
import { fetchExperimentDetails, fetchExperimentMetrics, fetchExperimentResult } from '@/services/experimentService';
import axios from '@/lib/axios';

interface JobRedirectInfo {
  experimentId: string;
  accessToken: string;
}

interface AppContextType {
  dataset: Dataset;
  successfulDatasets: DatasetUploadQueueItem[];
  experiments: Experiment[];
  activeExperimentId: string | null;
  workspaceMode: WorkspaceMode;
  comparisonExperimentIds: string[];
  
  // Multi-dataset parameter management
  parameterDrafts: Record<string, Record<string, any>>;
  selectedDatasetIds: string[];
  focusDatasetId: string | null;
  datasetAnnotationMap: Record<string, string>;
  updateParameterDraft: (datasetIds: string[], paramKey: string, value: any) => void;
  setSelectedDatasetIds: (ids: string[]) => void;
  setFocusDatasetId: (id: string | null) => void;
  resetParameterDrafts: () => void;
  setDatasetAnnotation: (datasetId: string, annotationId: string) => void;
  clearDatasetAnnotation: (datasetId: string) => void;
  
  // Dataset actions
  uploadGeneExpression: (files: File[]) => void;
  retryUploadQueueItem: (queueItemId: string) => void;
  updateDatasetName: (datasetId: string, datasetName: string) => void;
  removeUploadedDataset: (datasetId: string) => void;
  isDatasetReady: () => boolean;
  
  // Experiment actions
  createExperiment: (toolId: string, parameters: Record<string, unknown>, toolLabel?: string, numberOfRuns?: number, datasetIds?: string[], requirements?: ToolRequirements) => void;
  setActiveExperiment: (id: string | null) => void;
  submitExperiments: (email: string) => Promise<JobRedirectInfo | null>;
  refreshExperimentResult: (experimentId: string) => Promise<void>;
  toggleComparisonExperiment: (id: string) => void;
  clearComparisonExperiments: () => void;
  
  // Workspace actions
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  startNewExperiment: () => void;
  uploadSpatialCoordinates: (file: File) => void;
  uploadTissueImage: (file: File) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getDatasetNameFromFile = (fileName: string): string => {
  const stripped = fileName.replace(/\.[^/.]+$/, '').trim();
  return stripped || fileName;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataset, setDataset] = useState<Dataset>({
    id: crypto.randomUUID(),
    uploadId: null,
    datasetUploadQueue: [],
    spatialCoordinatesFile: null,
    tissueImageFile: null,
    summary: null,
  });
  const isQueueProcessingRef = useRef(false);
  const uploadQueueRef = useRef<DatasetUploadQueueItem[]>([]);
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('upload');
  const [comparisonExperimentIds, setComparisonExperimentIds] = useState<string[]>([]);
  
  // Multi-dataset parameter management
  const [parameterDrafts, setParameterDrafts] = useState<Record<string, Record<string, any>>>({});
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [focusDatasetId, setFocusDatasetId] = useState<string | null>(null);
  const [datasetAnnotationMap, setDatasetAnnotationMap] = useState<Record<string, string>>({});

  React.useEffect(() => {
    uploadQueueRef.current = dataset.datasetUploadQueue;
  }, [dataset.datasetUploadQueue]);

  const successfulDatasets = useMemo(
    () => dataset.datasetUploadQueue.filter((item) => item.status === 'SUCCESS'),
    [dataset.datasetUploadQueue]
  );

  const processUploadQueue = useCallback(async () => {
    if (isQueueProcessingRef.current) return;
    isQueueProcessingRef.current = true;

    try {
      while (uploadQueueRef.current.some((item) => item.status === 'PENDING')) {
        const nextItem = uploadQueueRef.current.find((item) => item.status === 'PENDING');
        if (!nextItem) break;

        setDataset((prev) => ({
          ...prev,
          datasetUploadQueue: prev.datasetUploadQueue.map((item) =>
            item.id === nextItem.id
              ? { ...item, status: 'UPLOADING' as const, uploadProgress: 0, error: undefined }
              : item
          ),
        }));

        try {
          const datasetId = await uploadGeneExpressionFile(nextItem.file, (progress) => {
            setDataset((prev) => ({
              ...prev,
              datasetUploadQueue: prev.datasetUploadQueue.map((item) =>
                item.id === nextItem.id ? { ...item, uploadProgress: progress } : item
              ),
            }));
          });

          const datasetName = nextItem.datasetName?.trim() || getDatasetNameFromFile(nextItem.fileName);

          setDataset((prev) => ({
            ...prev,
            uploadId: datasetId,
            datasetUploadQueue: prev.datasetUploadQueue.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    datasetId,
                    datasetName,
                    status: 'SUCCESS' as const,
                    uploadProgress: 100,
                  }
                : item
            ),
            summary: prev.summary || generateMockDatasetSummary(),
          }));
        } catch (err) {
          console.error(`Upload failed for ${nextItem.fileName}:`, err);
          setDataset((prev) => ({
            ...prev,
            datasetUploadQueue: prev.datasetUploadQueue.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: 'ERROR' as const,
                    uploadProgress: 0,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : item
            ),
          }));
        }
      }
    } finally {
      isQueueProcessingRef.current = false;
    }
  }, []);

  const uploadGeneExpression = useCallback((files: File[]) => {
    if (!files.length) return;

    const queueItems: DatasetUploadQueueItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      datasetName: getDatasetNameFromFile(file.name),
      datasetId: null,
      size: file.size,
      uploadProgress: 0,
      status: 'PENDING',
    }));

    setDataset((prev) => ({
      ...prev,
      datasetUploadQueue: [...prev.datasetUploadQueue, ...queueItems],
    }));
  }, []);

  const retryUploadQueueItem = useCallback((queueItemId: string) => {
    setDataset((prev) => ({
      ...prev,
      datasetUploadQueue: prev.datasetUploadQueue.map((item) =>
        item.id === queueItemId
          ? { ...item, status: 'PENDING' as const, uploadProgress: 0, error: undefined, datasetId: null }
          : item
      ),
    }));
  }, []);

  const updateDatasetName = useCallback((datasetId: string, datasetName: string) => {
    if (!datasetId) return; // Safety check for null datasetId
    const normalizedName = datasetName.trim();
    if (!normalizedName) return;

    setDataset((prev) => ({
      ...prev,
      datasetUploadQueue: prev.datasetUploadQueue.map((item) =>
        item.datasetId === datasetId ? { ...item, datasetName: normalizedName } : item
      ),
    }));
  }, []);

  React.useEffect(() => {
    const pendingItems = dataset.datasetUploadQueue.filter((item) => item.status === 'PENDING');
    if (pendingItems.length > 0 && !isQueueProcessingRef.current) {
      void processUploadQueue();
    }
  }, [dataset.datasetUploadQueue.length, processUploadQueue]);

  const uploadSpatialCoordinates = useCallback((file: File) => {
    setDataset((prev) => {
      const newDataset = { ...prev, spatialCoordinatesFile: file };
      if (successfulDatasets.length > 0 && newDataset.spatialCoordinatesFile && !newDataset.summary) {
        newDataset.summary = generateMockDatasetSummary();
      }
      return newDataset;
    });
  }, [successfulDatasets]);

  const uploadTissueImage = useCallback((file: File) => {
    setDataset((prev) => ({ ...prev, tissueImageFile: file }));
  }, []);

  const removeUploadedDataset = useCallback((idOrDatasetId: string) => {
    const removedDatasetIds: string[] = [];

    setDataset((prev) => {
      prev.datasetUploadQueue.forEach((item) => {
        if ((item.datasetId === idOrDatasetId || item.id === idOrDatasetId) && item.datasetId) {
          removedDatasetIds.push(item.datasetId);
        }
      });

      return {
        ...prev,
        datasetUploadQueue: prev.datasetUploadQueue.filter(
          (item) => item.datasetId !== idOrDatasetId && item.id !== idOrDatasetId
        ),
      };
    });
    
    // Garbage collect parameterDrafts for deleted dataset
    setParameterDrafts((prev) => {
      const copy = { ...prev };
      removedDatasetIds.forEach((datasetId) => {
        delete copy[datasetId];
      });
      if (removedDatasetIds.length === 0) {
        delete copy[idOrDatasetId];
      }
      return copy;
    });
    
    // Remove from selectedDatasetIds if present
    setSelectedDatasetIds((prev) => {
      const idsToRemove = removedDatasetIds.length > 0 ? removedDatasetIds : [idOrDatasetId];
      return prev.filter((id) => !idsToRemove.includes(id));
    });

    setDatasetAnnotationMap((prev) => {
      const copy = { ...prev };
      const idsToRemove = removedDatasetIds.length > 0 ? removedDatasetIds : [idOrDatasetId];
      idsToRemove.forEach((datasetId) => {
        delete copy[datasetId];
      });
      return copy;
    });
  }, []);

  React.useEffect(() => {
    if (selectedDatasetIds.length === 0) {
      if (focusDatasetId !== null) {
        setFocusDatasetId(null);
      }
      return;
    }

    if (!focusDatasetId || !selectedDatasetIds.includes(focusDatasetId)) {
      setFocusDatasetId(selectedDatasetIds[0]);
    }
  }, [selectedDatasetIds, focusDatasetId]);

  const isDatasetReady = useCallback(() => {
    return successfulDatasets.length > 0;
  }, [successfulDatasets]);

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
  }, [experiments, successfulDatasets, parameterDrafts]);

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
      window.sessionStorage.removeItem('experiment-builder-state-v1');
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
        dataset,
        successfulDatasets,
        experiments,
        activeExperimentId,
        workspaceMode,
        comparisonExperimentIds,
        parameterDrafts,
        selectedDatasetIds,
        focusDatasetId,
        datasetAnnotationMap,
        uploadGeneExpression,
        retryUploadQueueItem,
        updateDatasetName,
        removeUploadedDataset,
        isDatasetReady,
        uploadSpatialCoordinates,
        uploadTissueImage,
        createExperiment,
        setActiveExperiment,
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
