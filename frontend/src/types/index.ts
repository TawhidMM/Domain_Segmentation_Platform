export type ExperimentStatus = 'not-submitted' | 'queued' | 'running' | 'completed';

export interface Dataset {
  id: string;
  geneExpressionFile: null | {
    name: string;
    size: number;
    uploadProgress: number;
    status: 'idle' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';
  };
  spatialCoordinatesFile: File | null;
  tissueImageFile: File | null;
  summary: {
    spotCount: number;
    geneCount: number;
  } | null;
}

export interface ParameterValue {
  [key: string]: number | string | boolean;
}

export interface Experiment {
  id: string;
  toolId: string;
  toolName: string;
  parameters: ParameterValue;
  status: ExperimentStatus;
  createdAt: Date;
  completedAt: Date | null;
  result: ExperimentResult | null;
}

export interface ExperimentResult {
  domains: number[];
  coordinates: { x: number; y: number }[];
  domainColors: string[];
}

export type ParameterType = 'slider' | 'number' | 'select' | 'checkbox';

export interface ParameterConfig {
  id: string;
  label: string;
  type: ParameterType;
  defaultValue: number | string | boolean;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  advanced?: boolean;
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  fullDescription: string;
  parameters: ParameterConfig[];
}

// API-based tool schema types
export type ToolParameterType = 'int' | 'enum' | 'float_range' | 'int_list' | 'float_list' | 'bool' | 'float';

export interface FloatRangeDefault {
  min: number;
  max: number;
  step: number;
}

export interface DependsOnCondition {
  [paramKey: string]: string[];
}

export interface ToolParameterSchema {
  type: ToolParameterType;
  label: string;
  default: number | string | number[] | FloatRangeDefault;
  min?: number;
  max?: number;
  options?: string[];
  depends_on?: DependsOnCondition;
  ui_group: 'basic' | 'advanced';
}

export interface ToolSchema {
  tool_id: string;
  label: string;
  description: string;
  params: {
    [key: string]: ToolParameterSchema;
  };
}

export type WorkspaceMode = 'upload' | 'builder' | 'focus' | 'comparison';
