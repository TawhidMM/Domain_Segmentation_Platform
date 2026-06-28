import { create } from 'zustand';
import type { BootstrapStore, BootstrapState } from './bootstrapTypes';

const initialState: BootstrapState = {
  phase: 'pending',
  hasValidDatasets: false,
  shouldRestorePipeline: false,
  error: null,
};

export const useBootstrapStore = create<BootstrapStore>()((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setHasValidDatasets: (has) => set({ hasValidDatasets: has }),
  setShouldRestorePipeline: (should) => set({ shouldRestorePipeline: should }),
  setError: (error) => set({ error }),
}));