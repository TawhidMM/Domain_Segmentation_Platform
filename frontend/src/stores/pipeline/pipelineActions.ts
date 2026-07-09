import type { PipelineStore, PipelineState } from './pipelineTypes';
import type { ToolSchema } from '@/types';
import { useUIStore } from '@/store/useUIStore';

export const createPipelineActions = (
  set: (partial: Partial<PipelineState> | ((prev: PipelineState) => Partial<PipelineState>)) => void,
  get: () => PipelineStore,
) => ({
  setSelectedTool: (schema: ToolSchema | null) => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        selectedTool: schema?.tool_id ?? null,
        selectedToolSchema: schema,
        parameters: schema ? initializeParameterValues(schema) : {},
        lastUpdated: Date.now(),
      },
    }));
  },

  setParameters: (params: Record<string, unknown>) => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        parameters: params,
        lastUpdated: Date.now(),
      },
    }));
  },

  setNumberOfRuns: (count: number) => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        numberOfRuns: count,
        lastUpdated: Date.now(),
      },
    }));
  },

  setActiveStep: (step: number) => {
    set({ activeStep: step });
  },

  recordCreatedExperiment: (snapshot: import('./pipelineTypes').CreatedExperimentSnapshot) => {
    set({ lastCreatedExperiment: snapshot });
  },

  resetPipeline: () => {
    set({
      configuration: {
        selectedTool: null,
        selectedToolSchema: null,
        parameters: {},
        numberOfRuns: 1,
        lastUpdated: Date.now(),
      },
      activeStep: 0,
      lastCreatedExperiment: null,
    });
  },

  /**
   * Atomic action to load an experiment for editing.
   * Restores all configuration and switches to builder view in one operation.
   */
  loadExperimentForEditing: (experiment: import('@/types').Experiment, schema?: ToolSchema) => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        selectedTool: experiment.toolId,
        selectedToolSchema: schema ?? prev.configuration.selectedToolSchema,
        parameters: experiment.parameters,
        numberOfRuns: experiment.numberOfRuns,
        lastUpdated: Date.now(),
      },
      activeStep: 1, // Go to parameters step for editing
      lastCreatedExperiment: null, // Clear so restoration works correctly
    }));

    useUIStore.getState().setWorkspaceView('builder');
  },

  handleStepBack: () => {
    const currentStep = get().activeStep;
    
    if (currentStep > 0) {
      set({ activeStep: currentStep - 1 });
    } else {
      useUIStore.getState().setWorkspaceView('upload');
    }
  },
});

// Imported locally to avoid circular deps with pipeline store
function initializeParameterValues(schema: { parameters: Record<string, { default?: unknown }> }): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, meta] of Object.entries(schema.parameters)) {
    if (meta.default !== undefined) {
      values[key] = meta.default;
    }
  }
  return values;
}