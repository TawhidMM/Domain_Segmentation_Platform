import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { CheckCircle2, Clock, AlertCircle, Play } from 'lucide-react';
import { RunDetail } from '@/types';

export interface RunsListProps {
  runs: RunDetail[];
  datasetId: string;
  selectedRunId: string | null;
  onRunSelect: (runId: string) => void;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'finished':
      return <CheckCircle2 size={14} style={{ flexShrink: 0 }} />;
    case 'running':
      return <Play size={14} style={{ flexShrink: 0 }} />;
    case 'failed':
      return <AlertCircle size={14} style={{ flexShrink: 0 }} />;
    case 'queued':
    default:
      return <Clock size={14} style={{ flexShrink: 0 }} />;
  }
};

const getStatusColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
  switch (status.toLowerCase()) {
    case 'finished':
      return 'success';
    case 'running':
      return 'info';
    case 'failed':
      return 'error';
    case 'queued':
      return 'warning';
    default:
      return 'default';
  }
};

const RunsList: React.FC<RunsListProps> = ({ runs, datasetId, selectedRunId, onRunSelect }) => {
  if (!runs || runs.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          No runs available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'transparent', py: 0.5, px: 1 }}>
      {runs.map((run, index) => {
        const isSelected = selectedRunId === run.run_id;

        return (
          <Button
            key={run.run_id}
            onClick={() => onRunSelect(run.run_id)}
            fullWidth
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 1,
              mb: 0.5,
              textAlign: 'left',
              textTransform: 'none',
              color: 'text.primary',
              bgcolor: isSelected ? '#eef4ff' : 'transparent',
              borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isSelected ? '#eef4ff' : '#f3f4f6',
              },
            }}
          >
            {/* Status Icon */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: `${getStatusColor(run.status)}.main`,
                minWidth: 16,
              }}
            >
              {getStatusIcon(run.status)}
            </Box>

            {/* Run Info */}
            <Box sx={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: isSelected ? 600 : 500,
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                run_{index + 1}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {run.run_id.substring(0, 10)}...
              </Typography>
            </Box>

            {/* Status Badge */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1,
                py: 0.25,
                borderRadius: '999px',
                backgroundColor: run.status === 'finished' ? '#e6f7ee' : run.status === 'running' ? '#e3f2fd' : run.status === 'failed' ? '#ffebee' : '#fff3cd',
                color: run.status === 'finished' ? '#16a34a' : run.status === 'running' ? '#1976d2' : run.status === 'failed' ? '#d32f2f' : '#856404',
                fontSize: '10px',
                fontWeight: 600,
                minWidth: 50,
                textAlign: 'center',
              }}
            >
              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </Box>
          </Button>
        );
      })}
    </Box>
  );
};

export default RunsList;
