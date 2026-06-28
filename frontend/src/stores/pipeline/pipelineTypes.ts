import { ToolSchema, ToolRequirements } from '@/types';

export interface PipelineConfiguration {
  selectedTool: string | null;
  selectedToolSchema: ToolSchema | null;
  parameters: Record<string, unknown>;
  numberOfRuns: number;
  lastUpdated: number;
}

export interface CreatedExperimentSnapshot {
  toolId: string;
  parameters: Record<string, unknown>;
  toolLabel: string;
  numberOfRuns: number;
  datasetIds: string[];
  requirements?: ToolRequirements;
  createdAt: number;
}

export interface PipelineState {
  configuration: PipelineConfiguration;
  activeStep: number;
  /** Snapshot of the last experiment that was created. Persisted so it can be re-created after refresh. */
  lastCreatedExperiment: CreatedExperimentSnapshot | null;
}

export interface PipelineActions {
  setSelectedTool: (schema: ToolSchema | null) => void;
  setParameters: (params: Record<string, unknown>) => void;
  setNumberOfRuns: (count: number) => void;
  setActiveStep: (step: number) => void;
  recordCreatedExperiment: (snapshot: CreatedExperimentSnapshot) => void;
  resetPipeline: () => void;
}

export type PipelineStore = PipelineState & PipelineActions;