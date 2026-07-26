import type { PipelineStore, PipelineState } from './pipelineTypes';
import type { ToolSchema, Experiment } from '@/types';
import { useUIStore } from '@/stores/ui/uiStore.ts';

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
      configuration: { ...prev.configuration, parameters: params, lastUpdated: Date.now() },
    }));
  },
  setSeedList: (seedList: number[]) => {
    set((prev) => ({
      configuration: { ...prev.configuration, seedList, numberOfRuns: seedList.length, lastUpdated: Date.now() },
    }));
  },
  setActiveStep: (step: number) => { set({ activeStep: step }); },
  recordCreatedExperiment: (snapshot: import('./pipelineTypes').CreatedExperimentSnapshot) => {
    set({ lastCreatedExperiment: snapshot });
  },
  resetPipeline: () => {
    set({
      configuration: { selectedTool: null, selectedToolSchema: null, parameters: {}, numberOfRuns: 1, seedList: [], lastUpdated: Date.now() },
      activeStep: 0, lastCreatedExperiment: null,
    });
  },
  resetBuilderState: () => {
    set((prev) => ({
      configuration: { ...prev.configuration, selectedTool: null, selectedToolSchema: null, parameters: {}, numberOfRuns: 1, seedList: [], lastUpdated: Date.now() },
      activeStep: 0, lastCreatedExperiment: null,
    }));
  },
  loadExperimentForEditing: (experiment: Experiment, schema?: ToolSchema) => {
    set((prev) => ({
      configuration: { ...prev.configuration, selectedTool: experiment.toolId, selectedToolSchema: schema ?? prev.configuration.selectedToolSchema, parameters: experiment.parameters, numberOfRuns: experiment.numberOfRuns, seedList: experiment.seedList, lastUpdated: Date.now() },
      activeStep: 1, lastCreatedExperiment: null,
    }));
    useUIStore.getState().setWorkspaceView('builder');
  },
  handleStepBack: () => {
    const currentStep = get().activeStep;
    if (currentStep > 0) set({ activeStep: currentStep - 1 });
    else useUIStore.getState().setWorkspaceView('upload');
  },
});

function initializeParameterValues(schema: { parameters: Record<string, { default?: unknown }> }): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, meta] of Object.entries(schema.parameters)) {
    if (meta.default !== undefined) values[key] = meta.default;
  }
  return values;
}
