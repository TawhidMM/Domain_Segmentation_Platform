import React from 'react';
import { Box, CircularProgress, Tooltip } from '@mui/material';
import { Check, Schedule, PlayArrow, RadioButtonUnchecked } from '@mui/icons-material';
import { ExperimentStatus } from '@/types';

interface StatusIndicatorProps {
  status: ExperimentStatus;
  size?: 'small' | 'medium';
}

const statusConfig: Record<ExperimentStatus, { color: string; icon: React.ReactNode; label: string }> = {
  [ExperimentStatus.NOT_SUBMITTED]: {
    color: '#94A3B8',
    icon: <RadioButtonUnchecked sx={{ fontSize: 16 }} />,
    label: 'Not Submitted',
  },
  [ExperimentStatus.QUEUED]: {
    color: '#EAB308',
    icon: <Schedule sx={{ fontSize: 16 }} />,
    label: 'Queued',
  },
  [ExperimentStatus.RUNNING]: {
    color: '#2563EB',
    icon: <CircularProgress size={14} sx={{ color: '#2563EB' }} />,
    label: 'Running',
  },
  [ExperimentStatus.COMPLETED]: {
    color: '#16A34A',
    icon: <Check sx={{ fontSize: 16 }} />,
    label: 'Completed',
  },
  [ExperimentStatus.FAILED]: {
    color: '#EF4444',
    icon: <RadioButtonUnchecked sx={{ fontSize: 16 }} />,
    label: 'Failed',
  },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, size = 'small' }) => {
  const config = statusConfig[status];
  const boxSize = size === 'small' ? 24 : 28;

  return (
    <Tooltip title={config.label} arrow placement="top">
      <Box
        sx={{
          width: boxSize,
          height: boxSize,
          borderRadius: '50%',
          backgroundColor: `${config.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </Box>
    </Tooltip>
  );
};

export default StatusIndicator;
