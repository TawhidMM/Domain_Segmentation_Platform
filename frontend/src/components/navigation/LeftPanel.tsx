import React from 'react';
import { Box, Typography, Button, Divider, Chip } from '@mui/material';
import { Add, CloudUpload, Science } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import ExperimentsList from './ExperimentsList';

const LeftPanel: React.FC = () => {
  const { dataset, isDatasetReady, startNewExperiment, experiments, setWorkspaceMode } = useApp();

  const unsubmittedCount = experiments.filter((e) => e.status === 'not-submitted').length;

  return (
    <Box
      sx={{
        width: 240,
        height: '100%',
        backgroundColor: '#F1F5F9',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Dataset Status */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Dataset
        </Typography>
        <Box
          onClick={() => setWorkspaceMode('upload')}
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: 1.5,
            backgroundColor: isDatasetReady() ? 'rgba(13, 148, 136, 0.1)' : 'white',
            border: '1px solid',
            borderColor: isDatasetReady() ? 'primary.main' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUpload sx={{ fontSize: 18, color: isDatasetReady() ? 'primary.main' : 'text.secondary' }} />
            <Typography variant="body2" fontWeight={500}>
              {isDatasetReady() ? 'Dataset Ready' : 'Upload Required'}
            </Typography>
          </Box>
          {dataset.summary && (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
              <Chip
                label={`${dataset.summary.spotCount.toLocaleString()} spots`}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(13, 148, 136, 0.15)', color: 'primary.dark' }}
              />
              <Chip
                label={`${(dataset.summary.geneCount / 1000).toFixed(1)}k genes`}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(37, 99, 235, 0.15)', color: 'secondary.dark' }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Experiments Section */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
              Experiments
            </Typography>
          </Box>
          {unsubmittedCount > 0 && (
            <Chip
              label={unsubmittedCount}
              size="small"
              sx={{
                height: 18,
                minWidth: 18,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: 'warning.main',
                color: 'white',
              }}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <ExperimentsList />
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Add />}
            onClick={startNewExperiment}
            disabled={!isDatasetReady()}
            sx={{
              py: 1,
              fontSize: '0.8125rem',
            }}
          >
            New Experiment
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LeftPanel;
