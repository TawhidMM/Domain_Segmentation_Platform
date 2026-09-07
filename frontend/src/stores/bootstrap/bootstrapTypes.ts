import { BootstrapPhase } from '@/types';

export type { BootstrapPhase };

export interface BootstrapState {
  phase: BootstrapPhase;
  hasValidDatasets: boolean;
  shouldRestorePipeline: boolean;
  error: string | null;
}

export interface BootstrapActions {
  setPhase: (phase: BootstrapPhase) => void;
  setHasValidDatasets: (has: boolean) => void;
  setShouldRestorePipeline: (should: boolean) => void;
  setError: (error: string | null) => void;
}

export type BootstrapStore = BootstrapState & BootstrapActions;