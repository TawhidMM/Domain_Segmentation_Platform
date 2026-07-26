import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Experiment, ExperimentStatus, Run, DatasetRunMapping } from '@/types';

export interface ExperimentsState {
  experiments: Experiment[];
  activeExperimentId: string | null;
}

export interface ExperimentsActions {
  addExperiment: (experiment: Experiment) => void;
  removeExperiment: (id: string) => void;
  setActiveExperiment: (id: string | null) => void;
  updateExperimentRuns: (experimentId: string, runs: Run[]) => void;
  updateExperimentStatus: (experimentId: string, status: ExperimentStatus) => void;
  fillRunIds: (experimentId: string, runsByDataset: DatasetRunMapping[]) => void;
  resetExperiments: () => void;
}

export type ExperimentsStore = ExperimentsState & ExperimentsActions;

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

const STORAGE_KEY = 'experiments-store-v1';

const initialState: ExperimentsState = {
  experiments: [],
  activeExperimentId: null,
};

export const useExperimentsStore = create<ExperimentsStore>()(
  persist(
    (set) => ({
      ...initialState,
      addExperiment: (experiment: Experiment) => {
        set((prev) => {
          const displayName = computeDisplayName(experiment.toolName, prev.experiments);
          const initialRuns = buildInitialRuns(experiment);
          const experimentWithDisplayName = { ...experiment, displayName, runs: initialRuns };
          return { experiments: [...prev.experiments, experimentWithDisplayName], activeExperimentId: experiment.id };
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
      setActiveExperiment: (id: string | null) => set({ activeExperimentId: id }),
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
      resetExperiments: () => set({ experiments: [], activeExperimentId: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        experiments: state.experiments,
        activeExperimentId: state.activeExperimentId,
      }),
    }
  )
);
