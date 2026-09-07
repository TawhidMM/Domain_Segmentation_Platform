import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ComparisonExperiment } from './comparisonTypes';
import { useExperimentsStore } from '@/stores/experiments';

const BASKET_STORAGE_KEY = 'comparison_basket';

export interface ComparisonState {
  basket: ComparisonExperiment[];
}

export interface ComparisonActions {
  addExperiment: (id: string, token: string, experimentName?: string) => void;
  removeExperiment: (id: string) => void;
  removeExperiments: (ids: string[]) => void;
  pruneNotIn: (validIds: string[]) => void;
  isExperimentInBasket: (id: string) => boolean;
  getCompareUrl: () => string;
  clear: () => void;
}

export type ComparisonStore = ComparisonState & ComparisonActions;

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      basket: [],

      addExperiment: (id: string, token: string, experimentName?: string) => {
        set((state) => {
          if (state.basket.some((exp) => exp.id === id)) {
            return state;
          }
          return { basket: [...state.basket, { id, token, experimentName }] };
        });
      },

      removeExperiment: (id: string) => {
        const { basket } = get();
        set({ basket: basket.filter((exp) => exp.id !== id) });
      },

      removeExperiments: (ids: string[]) => {
        const { basket } = get();
        const idSet = new Set(ids);
        set({ basket: basket.filter((exp) => !idSet.has(exp.id)) });
      },

      pruneNotIn: (validIds: string[]) => {
        const { basket } = get();
        const validSet = new Set(validIds);
        set({ basket: basket.filter((exp) => validSet.has(exp.id)) });
      },

      isExperimentInBasket: (id: string): boolean => {
        return get().basket.some((exp) => exp.id === id);
      },

      getCompareUrl: () => {
        const { basket } = get();
        if (basket.length < 2) return '';
        const ids = basket.map((exp) => exp.id).join(',');
        const tokens = basket.map((exp) => exp.token).join(',');
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

//  Cross-tab sync 
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== BASKET_STORAGE_KEY) return;

    if (event.newValue === null) {
      useComparisonStore.setState({ basket: [] });
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue);
      const basket = parsed?.state?.basket ?? [];
      useComparisonStore.setState({ basket });
    } catch {
        /* empty */
    }
  });
}

// Referential integrity: basket must be a subset of live experiments.
// Enforces the invariant no matter how experiments disappear (UI delete,
// bootstrap validation, resetExperiments, raw set() calls) — one enforcement
// point, zero call-site discipline required.
if (typeof window !== 'undefined') {
  useExperimentsStore.subscribe((state, prevState) => {
    if (!useComparisonStore.persist.hasHydrated()) return;

    const prevIds = new Set(prevState.experiments.map((e) => e.id));
    const nextIds = new Set(state.experiments.map((e) => e.id));

    const shrank = prevIds.size > 0 && [...prevIds].some((id) => !nextIds.has(id));
    if (!shrank) return;

    useComparisonStore.getState().pruneNotIn(state.experiments.map((e) => e.id));
  });
}
