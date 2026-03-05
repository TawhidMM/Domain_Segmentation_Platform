import React from 'react';
import { Box, Typography } from '@mui/material';
import DatasetItem from './DatasetItem';
import { DatasetGroup } from '@/types';

export interface DatasetExplorerProps {
  datasets: DatasetGroup[];
  selectedRunId: string | null;
  expandedDatasets: Set<string>;
  onRunSelect: (runId: string) => void;
  onDatasetToggle: (datasetId: string) => void;
}

const DatasetExplorer: React.FC<DatasetExplorerProps> = ({
  datasets,
  selectedRunId,
  expandedDatasets,
  onRunSelect,
  onDatasetToggle,
}) => {
  if (!datasets || datasets.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">No datasets found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pt: 1, flex: 1, overflow: 'auto' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.5px' }}>
        Datasets
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {datasets.map((dataset) => (
          <DatasetItem
            key={dataset.dataset_id}
            dataset={dataset}
            isExpanded={expandedDatasets.has(dataset.dataset_id)}
            selectedRunId={selectedRunId}
            onToggle={() => onDatasetToggle(dataset.dataset_id)}
            onRunSelect={onRunSelect}
          />
        ))}
      </Box>
    </Box>
  );
};

export default DatasetExplorer;
