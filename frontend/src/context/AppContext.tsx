import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dataset, Experiment, WorkspaceMode, ExperimentStatus, ParameterValue } from '@/types';
import { generateMockDatasetSummary } from '@/data/mockData';
import { uploadGeneExpressionFile } from '@/services/uploadService';
import { fetchExperimentResult } from '@/services/experimentService';
import axios from '@/lib/axios';

interface AppContextType {
  dataset: Dataset;
  experiments: Experiment[];
  activeExperimentId: string | null;
  workspaceMode: WorkspaceMode;
  comparisonExperimentIds: string[];
  
  // Dataset actions
  uploadGeneExpression: (file: File) => void;
  uploadSpatialCoordinates: (file: File) => void;
  uploadTissueImage: (file: File) => void;
  isDatasetReady: () => boolean;
  
  // Experiment actions
  createExperiment: (toolId: string, parameters: Record<string, unknown>, toolLabel?: string) => void;
  setActiveExperiment: (id: string | null) => void;
  submitExperiments: (email: string) => void;
  refreshExperimentResult: (experimentId: string) => Promise<void>;
  toggleComparisonExperiment: (id: string) => void;
  clearComparisonExperiments: () => void;
  
  // Workspace actions
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  startNewExperiment: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataset, setDataset] = useState<Dataset>({
    id: crypto.randomUUID(),
    uploadId: null, // Backend upload_id from file upload
    geneExpressionFile: null,
    spatialCoordinatesFile: null,
    tissueImageFile: null,
    summary: null,
  });
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('upload');
  const [comparisonExperimentIds, setComparisonExperimentIds] = useState<string[]>([]);

  const uploadGeneExpression = useCallback(
    async (file: File) => {
      // Set initial upload state
      setDataset((prev) => ({
        ...prev,
        geneExpressionFile: {
          name: file.name,
          size: file.size,
          uploadProgress: 0,
          status: 'uploading',
        },
      }));

      try {
        // Call upload service with progress callback
        const uploadId = await uploadGeneExpressionFile(file, dataset.id, (progress) => {
          setDataset((prev) => ({
            ...prev,
            geneExpressionFile: prev.geneExpressionFile
              ? { ...prev.geneExpressionFile, uploadProgress: progress }
              : null,
          }));
        });

        // Mark as uploaded and start processing, store uploadId
        setDataset((prev) => ({
          ...prev,
          uploadId, // Store backend upload_id for experiment submission
          geneExpressionFile: prev.geneExpressionFile
            ? { ...prev.geneExpressionFile, status: 'processing' }
            : null,
        }));

        // Populate summary after upload completes
        setDataset((prev) => ({
          ...prev,
          summary: prev.summary || generateMockDatasetSummary(),
          geneExpressionFile: prev.geneExpressionFile
            ? { ...prev.geneExpressionFile, status: 'ready' }
            : null,
        }));
      } catch (err) {
        console.error('Upload failed:', err);
        setDataset((prev) => ({
          ...prev,
          geneExpressionFile: prev.geneExpressionFile
            ? { ...prev.geneExpressionFile, status: 'error', uploadProgress: 0 }
            : null,
        }));
      }
    },
    [dataset.id]
  );

  const uploadSpatialCoordinates = useCallback((file: File) => {
    setDataset((prev) => {
      const newDataset = { ...prev, spatialCoordinatesFile: file };
      if (newDataset.geneExpressionFile && newDataset.spatialCoordinatesFile && !newDataset.summary) {
        newDataset.summary = generateMockDatasetSummary();
      }
      return newDataset;
    });
  }, []);

  const uploadTissueImage = useCallback((file: File) => {
    setDataset((prev) => ({ ...prev, tissueImageFile: file }));
  }, []);

  const isDatasetReady = useCallback(() => {
    return !!(dataset.geneExpressionFile /* && dataset.spatialCoordinatesFile */);
  }, [dataset]);

  const createExperiment = useCallback((toolId: string, parameters: ParameterValue, toolLabel: string) => {
    const experiment: Experiment = {
      id: crypto.randomUUID(),
      toolId,
      toolName: toolLabel,
      parameters,
      status: 'not-submitted',
      createdAt: new Date(),
      completedAt: null,
      result: null,
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

  const submitExperiments = useCallback(async (email: string) => {
    if (!dataset.uploadId) {
      console.error('No upload_id available. Please upload dataset first.');
      return;
    }

    const unsubmittedExperiments = experiments.filter((e) => e.status === 'not-submitted');
    
    if (unsubmittedExperiments.length === 0) {
      console.log('No experiments to submit');
      return;
    }

    // Update status to queued
    setExperiments((prev) =>
      prev.map((e) =>
        e.status === 'not-submitted' ? { ...e, status: 'queued' as ExperimentStatus } : e
      )
    );

    // Submit each experiment to backend
    for (const exp of unsubmittedExperiments) {
      try {
        const formData = new FormData();
        formData.append('upload_id', dataset.uploadId);
        formData.append('tool_name', exp.toolId);
        formData.append('params', JSON.stringify(exp.parameters));
        formData.append('experiment_name', exp.toolName || exp.toolId);

        const response = await axios.post('/experiments/submit', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const jobId = response.data.job_id as string;
        console.log(`Experiment ${exp.id} submitted with job_id: ${jobId}`);

        // Update experiment with job_id and running status
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === exp.id
              ? { ...e, status: 'running' as ExperimentStatus, jobId, result: null }
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
  }, [experiments, dataset.uploadId]);

  const refreshExperimentResult = useCallback(
    async (experimentId: string) => {
      const target = experiments.find((e) => e.id === experimentId);
      if (!target?.jobId) {
        console.error('No jobId found for experiment');
        return;
      }

      try {
        const result = await fetchExperimentResult(target.jobId);
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === experimentId
              ? {
                  ...e,
                  status: 'completed' as ExperimentStatus,
                  completedAt: new Date(),
                  result: { ...result, jobId: target.jobId },
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
    setWorkspaceMode('builder');
    setActiveExperimentId(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        dataset,
        experiments,
        activeExperimentId,
        workspaceMode,
        comparisonExperimentIds,
        uploadGeneExpression,
        uploadSpatialCoordinates,
        uploadTissueImage,
        isDatasetReady,
        createExperiment,
        setActiveExperiment,
        submitExperiments,
        refreshExperimentResult,
        toggleComparisonExperiment,
        clearComparisonExperiments,
        setWorkspaceMode,
        startNewExperiment,
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
