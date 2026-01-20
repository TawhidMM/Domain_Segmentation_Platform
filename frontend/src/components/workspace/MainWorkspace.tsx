import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Science } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import DatasetUpload from '../dataset/DatasetUpload';
import ExperimentBuilder from '../experiment/ExperimentBuilder';
import FocusView from '../visualization/FocusView';
import ComparisonView from '../visualization/ComparisonView';

const MainWorkspace: React.FC = () => {
  const { workspaceMode, experiments, activeExperimentId } = useApp();

  const activeExperiment = experiments.find((e) => e.id === activeExperimentId);

  const renderContent = () => {
    switch (workspaceMode) {
      case 'upload':
        return <DatasetUpload />;

      case 'builder':
        return <ExperimentBuilder />;

      case 'focus':
        if (activeExperiment) {
          return <FocusView experiment={activeExperiment} />;
        }
        return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Paper
              sx={{
                p: 6,
                maxWidth: 400,
                mx: 'auto',
                backgroundColor: '#FAFAFA',
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Science sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                No Experiment Selected
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                Select an experiment from the left panel or create a new one
              </Typography>
            </Paper>
          </Box>
        );

      case 'comparison':
        return <ComparisonView />;

      default:
        return <DatasetUpload />;
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderContent()}
    </Box>
  );
};

export default MainWorkspace;
