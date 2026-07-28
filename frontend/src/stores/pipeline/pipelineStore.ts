import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPipelineActions } from './pipelineActions';
import type { PipelineStore, PipelineState } from './pipelineTypes';

const STORAGE_KEY = 'pipeline-store-v1';

const initialState: PipelineState = {
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
  editingExperimentId: null,
};

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => {
      const actions = createPipelineActions(set, get);

      return {
        ...initialState,
        ...actions,
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        configuration: state.configuration,
        activeStep: state.activeStep,
        lastCreatedExperiment: state.lastCreatedExperiment,
        editingExperimentId: state.editingExperimentId,
      }),
    }
  )
);
