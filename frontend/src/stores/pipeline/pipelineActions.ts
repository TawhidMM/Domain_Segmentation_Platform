import type { PipelineStore, PipelineState } from './pipelineTypes';
import type { ToolSchema, Experiment } from '@/types';
import { useUIStore } from '@/store/useUIStore';

/**
 * Compute display name for an experiment.
 * Returns "{toolName}" if it's the only experiment with that tool,
 * otherwise returns "{toolName} #{n}" where n is the sequential order.
 */
function computeDisplayName(toolName: string, allExperiments: Experiment[]): string {
  const sameToolExperiments = allExperiments
    .filter((e) => e.toolName === toolName)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // If there's only 1 experiment with this tool (current one doesn't exist yet), no numbering needed
  // This handles the case where we're adding the first experiment
  // But we need to re-number all when adding a second one, which is more complex
  // For now: if 0 existing, show toolName. If 1+ existing, show toolName #n
  const count = sameToolExperiments.length;
  
  if (count === 0) {
    return toolName;
  }
  
  // When adding, the new one will be count+1 in the sorted list
  return `${toolName} #${count + 1}`;
}

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
        // seedList stays as-is (no auto-initialization)
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

  setSeedList: (seedList: number[]) => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        seedList,
        numberOfRuns: seedList.length,
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
        seedList: [],
        lastUpdated: Date.now(),
      },
      activeStep: 0,
      lastCreatedExperiment: null,
      experiments: [],
      activeExperimentId: null,
    });
  },

  /**
   * Resets only the builder state (config, step, snapshot).
   * Does NOT touch experiments list - used when starting a new experiment.
   */
  resetBuilderState: () => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        selectedTool: null,
        selectedToolSchema: null,
        parameters: {},
        numberOfRuns: 1,
        seedList: [],
        lastUpdated: Date.now(),
      },
      activeStep: 0,
      lastCreatedExperiment: null,
      // NOTE: experiments and activeExperimentId are PRESERVED
    }));
  },

  /**
   * Atomic action to load an experiment for editing.
   * Restores all configuration and switches to builder view in one operation.
   */
  loadExperimentForEditing: (experiment: Experiment, schema?: ToolSchema) => {
    set((prev) => ({
      configuration: {
        ...prev.configuration,
        selectedTool: experiment.toolId,
        selectedToolSchema: schema ?? prev.configuration.selectedToolSchema,
        parameters: experiment.parameters,
        numberOfRuns: experiment.numberOfRuns,
        seedList: experiment.seedList,
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

  /**
   * Add an experiment to the store.
   * Computes and assigns displayName based on existing experiments with same tool.
   */
  addExperiment: (experiment: Experiment) => {
    set((prev) => {
      const displayName = computeDisplayName(experiment.toolName, prev.experiments);
      const experimentWithDisplayName = { ...experiment, displayName };

      const nextExperiments = [...prev.experiments, experimentWithDisplayName];

      return {
        experiments: nextExperiments,
        activeExperimentId: experiment.id,
      };
    });
  },

  /**
   * Remove an experiment from the store.
   * Adjusts activeExperimentId if the removed experiment was active.
   */
  removeExperiment: (id: string) => {
    set((prev) => {
      const nextExperiments = prev.experiments.filter((e) => e.id !== id);

      let nextActiveId = prev.activeExperimentId;
      if (prev.activeExperimentId === id) {
        // If we removed the active experiment, pick the first remaining one
        nextActiveId = nextExperiments[0]?.id ?? null;
      }

      return {
        experiments: nextExperiments,
        activeExperimentId: nextActiveId,
      };
    });
  },

  /**
   * Set the active experiment ID.
   */
  setActiveExperiment: (id: string | null) => {
    set({ activeExperimentId: id });
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