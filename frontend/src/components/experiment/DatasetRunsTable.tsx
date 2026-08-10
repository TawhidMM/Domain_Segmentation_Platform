import React from 'react';
import { Typography, Chip, Button } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import EntityList from '@/components/shared/EntityList';
import type { Run } from '@/types';

interface DatasetRunsTableProps {
  datasetId: string;
  datasetName: string;
  runs: Run[];
  accessToken: string;
  experimentId: string;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'queued':
      return '#EAB308';
    case 'running':
      return '#2563EB';
    case 'finished':
    case 'completed':
      return '#16A34A';
    case 'failed':
      return '#DC2626';
    default:
      return '#94A3B8';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'finished':
      return 'completed';
    default:
      return status;
  }
};

const DatasetRunsTable: React.FC<DatasetRunsTableProps> = ({
  datasetId,
  datasetName,
  runs,
  accessToken,
  experimentId,
}) => {
  if (!runs || runs.length === 0) {
    return null;
  }

  const completedCount = runs.filter((r) => r.status === 'finished' || r.status === 'completed').length;

  const handleOpenResult = (runId: string) => {
    window.open(
      `${window.location.origin}/experiment/${experimentId}?t=${accessToken}&run=${runId}`,
      '_blank'
    );
  };

  return (
    <EntityList
      title={`Dataset: ${datasetName}`}
      maxHeight={400}
      headerRight={
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {completedCount}/{runs.length} completed
        </Typography>
      }
    >
      {runs.map((run) => (
        <div
          key={run.runId}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            fontSize: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Typography variant="body2" sx={{ minWidth: '60px' }}>
              Seed: {run.seed}
            </Typography>
            <Chip
              label={getStatusLabel(run.status)}
              size="small"
              sx={{
                bgcolor: `${getStatusColor(run.status)}20`,
                color: getStatusColor(run.status),
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            />
          </div>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNew fontSize="small" />}
            onClick={() => handleOpenResult(run.runId)}
            disabled={!run.runId}
          >
            View Result
          </Button>
        </div>
      ))}
    </EntityList>
  );
};

export default DatasetRunsTable;