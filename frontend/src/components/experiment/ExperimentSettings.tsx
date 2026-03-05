import React from 'react';
import { Box, Paper, Typography, TextField, IconButton, Tooltip } from '@mui/material';
import { Info, Add, Remove } from '@mui/icons-material';

interface ExperimentSettingsProps {
  numberOfRuns: number;
  onChange: (value: number) => void;
}

const ExperimentSettings: React.FC<ExperimentSettingsProps> = ({ numberOfRuns, onChange }) => {
  const handleIncrementRuns = () => {
    if (numberOfRuns < 20) {
      onChange(numberOfRuns + 1);
    }
  };

  const handleDecrementRuns = () => {
    if (numberOfRuns > 1) {
      onChange(numberOfRuns - 1);
    }
  };

  const handleDirectChange = (value: number) => {
    // Clamp value between 1 and 20
    const clampedValue = Math.max(1, Math.min(20, value));
    onChange(clampedValue);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        backgroundColor: 'rgba(25, 103, 210, 0.02)',
        border: '1px solid',
        borderColor: 'primary.light',
        borderRadius: 1,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3, color: 'primary.main' }}>
        Experiment Settings
      </Typography>

      {/* Number of Runs Input */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Number of Runs
          </Typography>
          <Tooltip title="Each run will use a different random seed." arrow>
            <Info sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={handleDecrementRuns}
            disabled={numberOfRuns <= 1}
            color="primary"
            sx={{ p: 0.5 }}
          >
            <Remove fontSize="small" />
          </IconButton>

          <TextField
            type="number"
            value={numberOfRuns}
            onChange={(e) => handleDirectChange(Number(e.target.value))}
            inputProps={{
              min: 1,
              max: 20,
              step: 1,
              style: { textAlign: 'center', fontSize: 14, fontWeight: 600 },
            }}
            sx={{
              width: 70,
              '& .MuiOutlinedInput-root': {
                fontWeight: 600,
              },
            }}
            size="small"
          />

          <IconButton
            size="small"
            onClick={handleIncrementRuns}
            disabled={numberOfRuns >= 20}
            color="primary"
            sx={{ p: 0.5 }}
          >
            <Add fontSize="small" />
          </IconButton>

          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
            (1 - 20)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ExperimentSettings;
