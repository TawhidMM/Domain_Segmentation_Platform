import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WorkspaceView = 'upload' | 'builder';
export type WorkspaceTab = 'pipeline' | 'import';

interface UIState {
  currentView: WorkspaceView;
  activeTab: WorkspaceTab;
  setWorkspaceView: (view: WorkspaceView) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  resetUIState: () => void;
}

const STORAGE_KEY = 'workspace-ui-state-v1';

const initialState = {
  currentView: 'upload' as WorkspaceView,
  activeTab: 'pipeline' as WorkspaceTab,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,
      setWorkspaceView: (view) => set({ currentView: view }),
      setWorkspaceTab: (tab) => set({ activeTab: tab }),
      resetUIState: () => set({ ...initialState }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentView: state.currentView,
        activeTab: state.activeTab,
      }),
    }
  )
);