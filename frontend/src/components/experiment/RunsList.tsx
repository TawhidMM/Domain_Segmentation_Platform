import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
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
    <Box sx={{ bgcolor: 'background.default', py: 1 }}>
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
              gap: 1,
              px: 3,
              py: 1.5,
              textAlign: 'left',
              textTransform: 'none',
              color: 'text.primary',
              bgcolor: isSelected ? 'primary.light' : 'transparent',
              borderLeft: isSelected ? '3px solid' : '3px solid transparent',
              borderLeftColor: isSelected ? 'primary.main' : 'transparent',
              '&:hover': {
                bgcolor: isSelected ? 'primary.light' : 'action.hover',
              },
            }}
          >
            {/* Status Icon */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: `${getStatusColor(run.status)}.main`,
              }}
            >
              {getStatusIcon(run.status)}
            </Box>

            {/* Run Info */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                run_{index + 1}
              </Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {run.run_id.substring(0, 12)}...
              </Typography>
            </Box>

            {/* Status Badge */}
            <Chip
              label={run.status}
              size="small"
              color={getStatusColor(run.status)}
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                height: 20,
              }}
            />
          </Button>
        );
      })}
    </Box>
  );
};

export default RunsList;
