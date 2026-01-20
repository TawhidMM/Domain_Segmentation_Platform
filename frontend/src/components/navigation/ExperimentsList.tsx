import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { useApp } from '@/context/AppContext';
import StatusIndicator from './StatusIndicator';

const ExperimentsList: React.FC = () => {
  const { experiments, activeExperimentId, setActiveExperiment } = useApp();

  if (experiments.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          No experiments yet
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {experiments.map((experiment) => (
        <ListItemButton
          key={experiment.id}
          selected={experiment.id === activeExperimentId}
          onClick={() => setActiveExperiment(experiment.id)}
          sx={{
            py: 1,
            px: 2,
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '& .MuiTypography-root': {
                color: 'white',
              },
            },
          }}
        >
          <StatusIndicator status={experiment.status} />
          <ListItemText
            primary={experiment.toolName}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: 500,
              sx: { ml: 1.5 },
            }}
          />
        </ListItemButton>
      ))}
    </List>
  );
};

export default ExperimentsList;
