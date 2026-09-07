import { ToolSchema, ToolRequirements, Experiment } from '@/types';

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

export interface PipelineState {
  configuration: PipelineConfiguration;
  activeStep: number;
  /** Snapshot of the last experiment that was created. Persisted so it can be re-created after refresh. */
  lastCreatedExperiment: CreatedExperimentSnapshot | null;
  /** If set, the builder is editing this experiment instead of creating a new one. */
  editingExperimentId: string | null;
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
}

export type PipelineStore = PipelineState & PipelineActions;
