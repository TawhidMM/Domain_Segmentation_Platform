import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ComparisonJob } from './comparisonTypes';

const BASKET_STORAGE_KEY = 'comparison_basket';

export interface ComparisonState {
  basket: ComparisonJob[];
}

export interface ComparisonActions {
  addJob: (id: string, token: string, toolName?: string) => void;
  removeJob: (id: string) => void;
  isJobInBasket: (id: string) => boolean;
  getCompareUrl: () => string;
  clear: () => void;
}

export type ComparisonStore = ComparisonState & ComparisonActions;

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      basket: [],

      addJob: (id: string, token: string, toolName?: string) => {
        set((state) => {
          if (state.basket.some((job) => job.id === id)) {
            return state;
          }
          return { basket: [...state.basket, { id, token, toolName }] };
        });
      },

      removeJob: (id: string) => {
        const { basket } = get();
        set({ basket: basket.filter((job) => job.id !== id) });
      },

      isJobInBasket: (id: string): boolean => {
        return get().basket.some((job) => job.id === id);
      },

      getCompareUrl: () => {
        const { basket } = get();
        if (basket.length < 2) return '';
        const ids = basket.map((job) => job.id).join(',');
        const tokens = basket.map((job) => job.token).join(',');
        return `/compare?jobs=${ids}&tokens=${tokens}`;
      },

      clear: () => {
        set({ basket: [] });
      },
    }),
    {
      name: BASKET_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ basket: state.basket }),
    }
  )
);

// --- Cross-tab sync ---
// zustand's persist writes to localStorage but doesn't listen for changes
// made by OTHER tabs. The native `storage` event only fires in tabs that
// did NOT make the change, so this won't create loops.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== BASKET_STORAGE_KEY) return;

    if (event.newValue === null) {
      // basket was cleared / key removed in another tab
      useComparisonStore.setState({ basket: [] });
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue);
      const basket = parsed?.state?.basket ?? [];
      useComparisonStore.setState({ basket });
    } catch {
      // malformed data, ignore
    }
  });
}
