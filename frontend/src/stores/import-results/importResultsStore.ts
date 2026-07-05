import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ImportResultsStore, ImportResultsState, ImportResultsActions } from './importResultsTypes';
import type { StagedResultItem } from './importResultsTypes';
import { checkStagedResultsValidity } from '@/services/importResultService';

const STORAGE_KEY = 'import-results-store-v1';

const initialState: ImportResultsState = {
  toolName: 'my tool',
  selectedDatasetId: '',
  stagedItems: [],
  submittedDatasetIds: [],
};

export const useImportResultsStore = create<ImportResultsStore>()(
  persist(
    (set) => {
      const actions: ImportResultsActions = {
        setToolName: (name: string) =>
          set((prev) => ({ ...prev, toolName: name })),
        setSelectedDatasetId: (id: string) =>
          set((prev) => ({ ...prev, selectedDatasetId: id })),
        setStagedItems: (items: StagedResultItem[]) =>
          set((prev) => ({ ...prev, stagedItems: items })),
        addStagedItem: (item: StagedResultItem) =>
          set((prev) => ({ ...prev, stagedItems: [...prev.stagedItems, item] })),
        removeStagedItem: (stageId: string) =>
          set((prev) => ({
            ...prev,
            stagedItems: prev.stagedItems.filter((item) => item.stageId !== stageId),
          })),
        setSubmittedDatasetIds: (ids: string[]) =>
          set((prev) => ({ ...prev, submittedDatasetIds: ids })),
        addSubmittedDatasetId: (datasetId: string) =>
          set((prev) => ({
            ...prev,
            submittedDatasetIds: [...prev.submittedDatasetIds, datasetId],
          })),
        resetImportResults: () =>
          set({
            toolName: 'my tool',
            selectedDatasetId: '',
            stagedItems: [],
            submittedDatasetIds: [],
          }),

        validateStagedItems: async () => {
          const current = useImportResultsStore.getState().stagedItems;
          if (current.length === 0) return;

          const stageIds = current.map((item) => item.stageId);
          try {
            const validityMap = await checkStagedResultsValidity(stageIds);
            const validItems = current.filter((item) => validityMap[item.stageId]);
            const prunedCount = current.length - validItems.length;

            if (prunedCount > 0) {
              useImportResultsStore.setState((prev) => ({
                ...prev,
                stagedItems: validItems,
              }));
            }
          } catch {
            // Backend unreachable — keep existing staged items
          }
        },
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
        toolName: state.toolName,
        selectedDatasetId: state.selectedDatasetId,
        stagedItems: state.stagedItems,
        submittedDatasetIds: state.submittedDatasetIds,
      }),
    }
  )
);
