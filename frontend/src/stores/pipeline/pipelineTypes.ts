import { ToolSchema, ToolRequirements, Experiment, ExperimentStatus } from '@/types';

export interface PipelineConfiguration {
  selectedTool: string | null;
  selectedToolSchema: ToolSchema | null;
  parameters: Record<string, unknown>;
  numberOfRuns: number;
  seedList: number[];
  lastUpdated: number;
}

export interface CreatedExperimentSnapshot {
  toolId: string;
  parameters: Record<string, unknown>;
  toolLabel: string;
  numberOfRuns: number;
  seedList: number[];
  datasetIds: string[];
  requirements?: ToolRequirements;
  createdAt: number;
}

export type BuilderTabValue = 'select-tool' | 'import-result';

export interface PipelineState {
  configuration: PipelineConfiguration;
  activeStep: number;
  /** Snapshot of the last experiment that was created. Persisted so it can be re-created after refresh. */
  lastCreatedExperiment: CreatedExperimentSnapshot | null;
  /** List of all experiments. Source of truth for experiment management (replacing AppContext). */
  experiments: Experiment[];
  /** Currently active experiment ID. Used to track which experiment is being viewed. */
  activeExperimentId: string | null;
}

export interface PipelineActions {
  setSelectedTool: (schema: ToolSchema | null) => void;
  setParameters: (params: Record<string, unknown>) => void;
  setSeedList: (seedList: number[]) => void;
  setActiveStep: (step: number) => void;
  recordCreatedExperiment: (snapshot: CreatedExperimentSnapshot) => void;
  resetPipeline: () => void;
  /** Resets only the builder state (config, step, snapshot). Does NOT touch experiments list. */
  resetBuilderState: () => void;
  loadExperimentForEditing: (experiment: Experiment, schema?: ToolSchema) => void;
  handleStepBack: () => void;
  /** Experiment management actions - source of truth for experiments */
  addExperiment: (experiment: Experiment) => void;
  removeExperiment: (id: string) => void;
  setActiveExperiment: (id: string | null) => void;
  /** Update runs for an experiment (used for polling updates) */
  updateExperimentRuns: (experimentId: string, runs: import('@/types').Run[]) => void;
  /** Fill run IDs after submit response */
  fillRunIds: (experimentId: string, runsByDataset: import('@/types').DatasetRunMapping[]) => void;
  /** Update experiment status */
  updateExperimentStatus: (experimentId: string, status: ExperimentStatus) => void;
}

export type PipelineStore = PipelineState & PipelineActions;
