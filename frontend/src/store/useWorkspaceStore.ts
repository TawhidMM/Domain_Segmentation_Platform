import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type AxiosInstance } from 'axios';

interface WorkspaceState {
  // Placeholder for future workspace-related state.
  // Dataset responsibilities have been moved to datasetStore.
}

const STORAGE_KEY = 'workspace-state-v1';

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    () => ({
      // No state yet — reserved for future workspace config.
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);