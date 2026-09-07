import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as UUID } from 'uuid';
import { ExperimentStatus } from '@/types';
import type { Experiment, Run, DatasetRunMapping } from '@/types';
import { validateExperimentsWithBackend } from './experimentsActions';

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
  updateExperiment: (experimentId: string, updates: Partial<Pick<Experiment, 'parameters' | 'seedList' | 'numberOfRuns' | 'datasetIds'>>) => void;
  setExperimentAnnotation: (experimentId: string, datasetId: string, annotationId: string | null) => void;
  resetExperiments: () => void;
  validateExperimentsWithBackend: () => Promise<{ removedSubmitted: number; removedUnsubmitted: number }>;
}

export type ExperimentsStore = ExperimentsState & ExperimentsActions;

function computeExperimentName(toolName: string, allExperiments: Experiment[]): string {
  const numberedPrefix = `${toolName} #`;

  let maxSuffix = 0;

  for (const experiment of allExperiments) {
    if (experiment.experimentName === toolName) {
      maxSuffix = Math.max(maxSuffix, 1);
    }
    else if (experiment.experimentName.startsWith(numberedPrefix)) {
      const suffix = experiment.experimentName.slice(numberedPrefix.length);

      if (/^\d+$/.test(suffix)) {
        maxSuffix = Math.max(maxSuffix, Number(suffix));
      }
    }
  }

  if (maxSuffix === 0) return toolName;

  return `${toolName} #${maxSuffix + 1}`;
}

function buildInitialRuns(experiment: Experiment): Run[] {
  return experiment.datasetIds.flatMap((datasetId) =>
    experiment.seedList.map((seed) => {
      return {
        id: UUID(),
        runId: '',
        datasetId,
        seed,
        status: ExperimentStatus.NOT_SUBMITTED,
        result: null,
      };
    })
  );
}

const STORAGE_KEY = 'experiments-store-v1';

const initialState: ExperimentsState = {
  experiments: [],
  activeExperimentId: null,
};

export const useExperimentsStore = create<ExperimentsStore>()(
  persist(
    (set, get) => {
      const actions = {
        addExperiment: (experiment: Experiment) => {
          set((prev) => {
            const experimentName = computeExperimentName(experiment.toolId, prev.experiments);
            const initialRuns = buildInitialRuns(experiment);
            const experimentWithDisplayName = { ...experiment, experimentName, runs: initialRuns };
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
              return { ...run, runId, status: ExperimentStatus.QUEUED };
            });
            return { experiments: prev.experiments.map((e) => e.id === experimentId ? { ...e, runs: updatedRuns } : e) };
          });
        },
        updateExperiment: (experimentId: string, updates: Partial<Pick<Experiment, 'parameters' | 'seedList' | 'numberOfRuns' | 'datasetIds'>>) => {
          set((prev) => ({
            experiments: prev.experiments.map((e) => {
              if (e.id !== experimentId) return e;
              const next: Experiment = { ...e, ...updates };
              if (updates.seedList || updates.datasetIds) {
                const seedList = updates.seedList ?? e.seedList;
                const datasetIds = updates.datasetIds ?? e.datasetIds;
                next.runs = datasetIds.flatMap((datasetId) =>
                  seedList.map((seed) => {

                    return {
                      id: UUID(),
                      runId: '',
                      datasetId,
                      seed,
                      status: ExperimentStatus.NOT_SUBMITTED,
                      result: null,
                    };
                  })
                );
              }
              return next;
            }),
            activeExperimentId: experimentId,
          }));
        },
        setExperimentAnnotation: (experimentId: string, datasetId: string, annotationId: string | null) => {
          set((prev) => ({
            experiments: prev.experiments.map((e) => {
              if (e.id !== experimentId) return e;
              const nextAnnotationIds = { ...(e.annotationIds ?? {}) };
              if (annotationId === null) {
                delete nextAnnotationIds[datasetId];
              } else {
                nextAnnotationIds[datasetId] = annotationId;
              }
              return { ...e, annotationIds: nextAnnotationIds };
            }),
          }));
        },

        resetExperiments: () => set({ experiments: [], activeExperimentId: null }),
        validateExperimentsWithBackend: () => validateExperimentsWithBackend(get, set),
      };

      return {
        ...initialState,
        ...actions,
      };
    },
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
