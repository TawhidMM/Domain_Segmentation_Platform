export interface StagedResultItem {
  stageId: string;
  datasetId: string;
  datasetName: string;
  fileName: string;
}

export interface ImportResultsState {
  toolName: string;
  selectedDatasetId: string;
  stagedItems: StagedResultItem[];
  submittedDatasetIds: string[];
}

export interface ImportResultsActions {
  setToolName: (name: string) => void;
  setSelectedDatasetId: (id: string) => void;
  setStagedItems: (items: StagedResultItem[]) => void;
  addStagedItem: (item: StagedResultItem) => void;
  removeStagedItem: (stageId: string) => void;
  setSubmittedDatasetIds: (ids: string[]) => void;
  addSubmittedDatasetId: (datasetId: string) => void;
  resetImportResults: () => void;
  validateStagedItems: () => Promise<void>;
}

export type ImportResultsStore = ImportResultsState & ImportResultsActions;