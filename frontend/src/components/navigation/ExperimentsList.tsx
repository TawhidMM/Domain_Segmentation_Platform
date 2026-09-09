import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText, IconButton, Tooltip } from '@mui/material';
import { DeleteOutline, GridView } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { useComparisonStore } from '@/stores/comparison';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import { ExperimentStatus, WorkspaceView } from '@/types';
import StatusIndicator from './StatusIndicator';

interface CompareIconButtonProps {
  exp: {
    id: string;
    experimentId?: string;
    accessToken?: string;
    experimentName?: string;
    status: ExperimentStatus;
  };
  selected: boolean;
}

const CompareIconButton: React.FC<CompareIconButtonProps> = ({ exp, selected }) => {
  const basket = useComparisonStore((state) => state.basket);
  const addExperiment = useComparisonStore((state) => state.addExperiment);
  const removeExperiment = useComparisonStore((state) => state.removeExperiment);

  const isInBasket = exp.experimentId ? basket.some((job) => job.id === exp.experimentId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!exp.experimentId || !exp.accessToken) return;
    if (isInBasket) {
      removeExperiment(exp.experimentId);
    } else {
      addExperiment(exp.experimentId, exp.accessToken, exp.experimentName);
    }
  };

  // Only show for completed experiments with experimentId
  if (exp.status !== ExperimentStatus.COMPLETED || !exp.experimentId) {
    return null;
  }

  return (
    <Tooltip title={isInBasket ? "Remove from comparison" : "Add to comparison"}>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          ml: 0.5,
          color: isInBasket ? '#10B981' : selected ? '#94A3B8' : 'text.secondary',
          '&:hover': {
            color: isInBasket ? '#059669' : '#10B981',
            backgroundColor: isInBasket
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(13, 148, 136, 0.08)',
          },
        }}
      >
        <GridView fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

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
        const displayText = experiment.experimentName;

        return (
          <ListItemButton
            key={experiment.id}
            selected={isSelected}
            onClick={() => {
              setActiveExperiment(experiment.id);
              useUIStore.getState().setWorkspaceView(WorkspaceView.FOCUS);
            }}
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
            <ListItemText
              primary={displayText}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: 500,
                sx: { ml: 1.5 },
              }}
            />
            <CompareIconButton exp={experiment} selected={isSelected} />
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                removeExperiment(experiment.id);
              }}
              aria-label={`Delete experiment ${displayText}`}
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