import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, IconButton } from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import StatusIndicator from './StatusIndicator';

const ExperimentsList: React.FC = () => {
  const { experiments, activeExperimentId, setActiveExperiment, removeExperiment } = useApp();

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
      {experiments.map((experiment) => {
        const isSelected = experiment.id === activeExperimentId;

        return (
          <ListItemButton
            key={experiment.id}
            selected={isSelected}
            onClick={() => setActiveExperiment(experiment.id)}
            sx={{
              py: 1,
              px: 2,
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
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
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                removeExperiment(experiment.id);
              }}
              aria-label={`Delete experiment ${experiment.toolName}`}
              sx={{
                ml: 0.5,
                color: isSelected ? 'rgba(255, 255, 255, 0.85)' : 'text.secondary',
                '&:hover': {
                  color: isSelected ? 'white' : 'error.main',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                },
              }}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </ListItemButton>
        );
      })}
    </List>
  );
};

export default ExperimentsList;
