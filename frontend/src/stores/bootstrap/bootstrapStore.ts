import { create } from 'zustand';
import type { BootstrapStore, BootstrapState } from './bootstrapTypes';
import { BootstrapPhase } from '@/types';

const initialState: BootstrapState = {
  phase: BootstrapPhase.PENDING,
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