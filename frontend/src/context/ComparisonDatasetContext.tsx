import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ComparisonDataset } from '@/types';
import { fetchComparisonDatasets } from '@/services/experimentService';

interface ComparisonDatasetContextType {
  datasets: ComparisonDataset[];
  selectedDataset: string | null;
  setSelectedDataset: (datasetId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const ComparisonDatasetContext = createContext<ComparisonDatasetContextType | undefined>(undefined);

interface ComparisonDatasetProviderProps {
  children: ReactNode;
  experiments: Array<{ experiment_id: string; token: string }>;
}

export const ComparisonDatasetProvider: React.FC<ComparisonDatasetProviderProps> = ({
  children,
  experiments,
}) => {
  const [datasets, setDatasets] = useState<ComparisonDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch datasets on mount or when experiments change
  useEffect(() => {
    if (experiments.length < 2) {
      setDatasets([]);
      setSelectedDataset(null);
      return;
    }

    const loadDatasets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchComparisonDatasets(experiments);
        setDatasets(response.datasets);
        // Auto-select first dataset
        if (response.datasets.length > 0) {
          setSelectedDataset(response.datasets[0].dataset_id);
        }
      } catch (err) {
        console.error('Error fetching comparison datasets:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch datasets');
        setDatasets([]);
        setSelectedDataset(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadDatasets();
  }, [experiments]);

  const value: ComparisonDatasetContextType = {
    datasets,
    selectedDataset,
    setSelectedDataset,
    isLoading,
    error,
  };

  return (
    <ComparisonDatasetContext.Provider value={value}>
      {children}
    </ComparisonDatasetContext.Provider>
  );
};

/**
 * Hook to access the current comparison dataset context.
 * Must be called within a ComparisonDatasetProvider.
 */
export const useComparisonDataset = (): ComparisonDatasetContextType => {
  const context = useContext(ComparisonDatasetContext);
  if (!context) {
    throw new Error('useComparisonDataset must be used within ComparisonDatasetProvider');
  }
  return context;
};

export default ComparisonDatasetContext;
