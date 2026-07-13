import type { PipelineStore, PipelineState } from './pipelineTypes';
import type { ToolSchema, Experiment, Run, DatasetRunMapping, ExperimentStatus } from '@/types';
import { useUIStore } from '@/store/useUIStore';

function computeDisplayName(toolName: string, allExperiments: Experiment[]): string {
  const sameToolExperiments = allExperiments
    .filter((e) => e.toolName === toolName)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const count = sameToolExperiments.length;
  if (count === 0) return toolName;
  return `${toolName} #${count + 1}`;
}

function buildInitialRuns(experiment: Experiment): Run[] {
  return experiment.datasetIds.flatMap((datasetId) =>
    experiment.seedList.map((seed) => ({
      runId: '',
      datasetId,
      seed,
      status: 'not-submitted' as const,
      result: null,
    }))
  );
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
      activeStep: 0, lastCreatedExperiment: null, experiments: [], activeExperimentId: null,
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
  addExperiment: (experiment: Experiment) => {
    set((prev) => {
      const displayName = computeDisplayName(experiment.toolName, prev.experiments);
      const initialRuns = buildInitialRuns(experiment);
      const experimentWithDisplayName = { ...experiment, displayName, runs: initialRuns };
      return { experiments: [...prev.experiments, experimentWithDisplayName], activeExperimentId: experiment.id };
    });
  },
  updateExperimentRuns: (experimentId: string, runs: Run[]) => {
    set((prev) => ({
      experiments: prev.experiments.map((e) => e.id === experimentId ? { ...e, runs } : e),
    }));
  },
  updateExperimentStatus: (experimentId: string, status: ExperimentStatus) => {
    set((prev) => ({
      experiments: prev.experiments.map((e) => e.id === experimentId ? { ...e, status } : e),
    }));
  },
  fillRunIds: (experimentId: string, runsByDataset: DatasetRunMapping[]) => {
    set((prev) => {
      const experiment = prev.experiments.find((e) => e.id === experimentId);
      if (!experiment || !experiment.runs) return { experiments: prev.experiments };
      const datasetToRunIds = new Map<string, string[]>();
      for (const mapping of runsByDataset) datasetToRunIds.set(mapping.dataset_id, mapping.run_ids);
      const updatedRuns: Run[] = experiment.runs.map((run) => {
        const runIds = datasetToRunIds.get(run.datasetId);
        if (!runIds) return run;
        const seedIndex = experiment.seedList.indexOf(run.seed);
        const runId = runIds[seedIndex] ?? '';
        return { ...run, runId, status: 'queued' as const };
      });
      return { experiments: prev.experiments.map((e) => e.id === experimentId ? { ...e, runs: updatedRuns } : e) };
    });
  },
  removeExperiment: (id: string) => {
    set((prev) => {
      const nextExperiments = prev.experiments.filter((e) => e.id !== id);
      let nextActiveId = prev.activeExperimentId;
      if (prev.activeExperimentId === id) nextActiveId = nextExperiments[0]?.id ?? null;
      return { experiments: nextExperiments, activeExperimentId: nextActiveId };
    });
  },
  setActiveExperiment: (id: string | null) => { set({ activeExperimentId: id }); },
});

function initializeParameterValues(schema: { parameters: Record<string, { default?: unknown }> }): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, meta] of Object.entries(schema.parameters)) {
    if (meta.default !== undefined) values[key] = meta.default;
  }
  return values;
}
