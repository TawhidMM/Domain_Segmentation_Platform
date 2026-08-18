import React, { useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useShallow } from 'zustand/react/shallow';
import { useDatasetStore } from '@/stores/dataset';
import { resolveDatasetParameters } from '@/utils/parameterUtils';
import { countRunsByStatus } from '@/types';
import DatasetRunsTable from './DatasetRunsTable';
import type { Experiment, Run, RunStatusValueFrontend } from '@/types';

interface ExperimentMonitoringPanelProps {
  experiment: Experiment;
  onViewParams: (datasetId: string, datasetName: string, params: Record<string, unknown>) => void;
}

const ExperimentMonitoringPanel: React.FC<ExperimentMonitoringPanelProps> = ({
  experiment,
  onViewParams,
}) => {
  const uploadedDatasets = useDatasetStore(
    useShallow((state) => state.datasets.filter((d) => d.status === 'SUCCESS'))
  );

  const datasetNameMap = useMemo(() => {
    const map = new Map<string, string>();
    uploadedDatasets.forEach((d) => {
      if (d.datasetId) map.set(d.datasetId, d.datasetName);
    });
    return map;
  }, [uploadedDatasets]);

  const runsByDataset = experiment.runs?.reduce<Record<string, { name: string; runs: Run[] }>>((groups, run) => {
    if (!groups[run.datasetId]) {
      groups[run.datasetId] = {
        name: datasetNameMap.get(run.datasetId) ?? run.datasetId,
        runs: [],
      };
    }
    groups[run.datasetId].runs.push(run);
    return groups;
  }, {});

  const handleViewParams = (datasetId: string) => {
    const datasetName = datasetNameMap.get(datasetId) ?? datasetId;
    const params = resolveDatasetParameters(datasetId, experiment.datasetParams, experiment.parameters);
    onViewParams(datasetId, datasetName, params);
  };

  if (!runsByDataset || Object.keys(runsByDataset).length === 0) {
    if (experiment.experimentId && experiment.accessToken) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Loading runs...
          </Typography>
        </Box>
      );
    }
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Object.entries(runsByDataset).map(([datasetId, data]) => (
        <Box key={datasetId}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={() => handleViewParams(datasetId)}
            >
              View Params
            </Button>
          </Box>
          <DatasetRunsTable
            datasetId={datasetId}
            datasetName={data.name}
            runs={data.runs}
            accessToken={experiment.accessToken ?? ''}
            experimentId={experiment.experimentId ?? ''}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ExperimentMonitoringPanel;