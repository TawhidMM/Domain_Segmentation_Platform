import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dataset, Experiment, WorkspaceMode, ExperimentStatus, ParameterValue } from '@/types';
import { generateMockDatasetSummary, generateMockResult } from '@/data/mockData';
import { getToolById } from '@/data/toolConfigs';

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
  createExperiment: (toolId: string, parameters: Record<string, unknown>) => void;
  setActiveExperiment: (id: string | null) => void;
  submitExperiments: (email: string) => void;
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
    geneExpressionFile: null,
    spatialCoordinatesFile: null,
    tissueImageFile: null,
    summary: null,
  });
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('upload');
  const [comparisonExperimentIds, setComparisonExperimentIds] = useState<string[]>([]);

  const uploadGeneExpression = useCallback((file: File) => {
    setDataset((prev) => {
      const newDataset = { ...prev, geneExpressionFile: file };
      if (newDataset.geneExpressionFile && newDataset.spatialCoordinatesFile && !newDataset.summary) {
        newDataset.summary = generateMockDatasetSummary();
      }
      return newDataset;
    });
  }, []);

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
    return !!(dataset.geneExpressionFile && dataset.spatialCoordinatesFile);
  }, [dataset]);

  const createExperiment = useCallback((toolId: string, parameters: ParameterValue) => {
    const tool = getToolById(toolId);
    if (!tool) return;

    const experiment: Experiment = {
      id: crypto.randomUUID(),
      toolId,
      toolName: tool.name,
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

  const submitExperiments = useCallback((email: string) => {
    console.log(`Submitting experiments to: ${email}`);
    
    const unsubmittedExperiments = experiments.filter((e) => e.status === 'not-submitted');
    
    // Update status to queued
    setExperiments((prev) =>
      prev.map((e) =>
        e.status === 'not-submitted' ? { ...e, status: 'queued' as ExperimentStatus } : e
      )
    );

    // Simulate sequential execution
    unsubmittedExperiments.forEach((exp, index) => {
      // Start running after delay
      setTimeout(() => {
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === exp.id ? { ...e, status: 'running' as ExperimentStatus } : e
          )
        );
      }, index * 3000 + 1000);

      // Complete after running
      setTimeout(() => {
        const numClusters = (exp.parameters.n_clusters as number) || 7;
        const result = generateMockResult(numClusters, dataset.summary?.spotCount || 2000);
        
        setExperiments((prev) =>
          prev.map((e) =>
            e.id === exp.id
              ? {
                  ...e,
                  status: 'completed' as ExperimentStatus,
                  completedAt: new Date(),
                  result,
                }
              : e
          )
        );
      }, index * 3000 + 4000);
    });
  }, [experiments, dataset.summary]);

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
