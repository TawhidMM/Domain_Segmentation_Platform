import { useState, useCallback, useEffect } from 'react';

export interface ComparisonJob {
  id: string;
  token: string;
}

const BASKET_STORAGE_KEY = 'comparison_basket';

export function useComparisonBasket() {
  const [basket, setBasket] = useState<ComparisonJob[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount and listen for changes
  useEffect(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(BASKET_STORAGE_KEY);
      if (stored) {
        setBasket(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load basket from localStorage:', error);
    }
    setIsInitialized(true);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BASKET_STORAGE_KEY) {
        try {
          const newBasket = e.newValue ? JSON.parse(e.newValue) : [];
          setBasket(newBasket);
        } catch (error) {
          console.error('Failed to parse basket from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper function to sync to localStorage
  const syncToStorage = (newBasket: ComparisonJob[]) => {
    try {
      localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(newBasket));
    } catch (error) {
      console.error('Failed to save basket to localStorage:', error);
    }
  };

  const addJob = useCallback((jobId: string, token: string) => {
    setBasket((prev) => {
      // Avoid duplicates
      if (prev.some((job) => job.id === jobId)) {
        return prev;
      }
      const newBasket = [...prev, { id: jobId, token }];
      syncToStorage(newBasket);
      return newBasket;
    });
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setBasket((prev) => {
      const newBasket = prev.filter((job) => job.id !== jobId);
      syncToStorage(newBasket);
      return newBasket;
    });
  }, []);

  const isJobInBasket = useCallback((jobId: string): boolean => {
    return basket.some((job) => job.id === jobId);
  }, [basket]);

  const getCompareUrl = useCallback((): string => {
    if (basket.length < 2) return '';
    const ids = basket.map((job) => job.id).join(',');
    const tokens = basket.map((job) => job.token).join(',');
    return `/compare?jobs=${ids}&tokens=${tokens}`;
  }, [basket]);

  const clear = useCallback(() => {
    syncToStorage([]);
    setBasket([]);
  }, []);

  return {
    basket,
    addJob,
    removeJob,
    isJobInBasket,
    getCompareUrl,
    clear,
    count: basket.length,
  };
}
