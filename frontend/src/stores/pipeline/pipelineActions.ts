import type { PipelineStore, PipelineState } from './pipelineTypes';
import type { ToolSchema } from '@/types';

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