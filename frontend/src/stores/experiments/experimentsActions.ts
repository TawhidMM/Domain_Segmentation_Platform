import type { ExperimentsStore } from './experimentsStore';
import { checkExperimentsExistence } from '@/services/experimentService';


export const validateExperimentsWithBackend = async (
  get: () => ExperimentsStore,
  set: (partial: Partial<ExperimentsStore> | ((prev: ExperimentsStore) => Partial<ExperimentsStore>)) => void,
): Promise<{ removedSubmitted: number; removedUnsubmitted: number }> => {

  const state = get();
  const submittedExperiments = state.experiments.filter(
    (e) => e.experimentId && e.accessToken
  );

  if (submittedExperiments.length === 0) return { removedSubmitted: 0, removedUnsubmitted: 0 };

  try {
    const backendPairs = submittedExperiments.map((e) => ({
      experiment_id: e.experimentId!,
      token: e.accessToken!,
    }));
    const validIds = await checkExperimentsExistence(backendPairs);
    const validIdSet = new Set(validIds);

    const prunedSubmitted = submittedExperiments.filter((e) => !validIdSet.has(e.experimentId!));
    const survivingExperiments = state.experiments.filter((e) => !e.experimentId || validIdSet.has(e.experimentId!));

    // Also remove unsubmitted experiments whose datasetIds reference pruned (expired) datasets
    const survivingDatasetIds = new Set(
      survivingExperiments.flatMap((e) => e.datasetIds)
    );
    const prunedUnsubmitted = survivingExperiments.filter(
      (e) => e.status === 'not-submitted' && e.datasetIds.some((id) => !survivingDatasetIds.has(id))
    );
    const finalExperiments = survivingExperiments.filter(
      (e) => !(e.status === 'not-submitted' && e.datasetIds.some((id) => !survivingDatasetIds.has(id)))
    );

    const nextActiveId = state.activeExperimentId && finalExperiments.some((e) => e.id === state.activeExperimentId)
      ? state.activeExperimentId
      : finalExperiments[0]?.id ?? null;

    set((prev) => ({
      experiments: finalExperiments,
      activeExperimentId: nextActiveId,
    }));

    return {
      removedSubmitted: prunedSubmitted.length,
      removedUnsubmitted: prunedUnsubmitted.length,
    };
  } catch (error) {
    console.error('Failed to validate experiments with backend:', error);
    return { removedSubmitted: 0, removedUnsubmitted: 0 };
  }
};