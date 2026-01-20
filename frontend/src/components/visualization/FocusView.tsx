import React, { useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Button, Chip, Paper, Divider } from '@mui/material';
import { Download, GridView, CenterFocusWeak, Schedule, PlayArrow, Check } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { Experiment } from '@/types';
import SpatialPlot from './SpatialPlot';
import SubmitModal from '../modals/SubmitModal';

interface FocusViewProps {
  experiment: Experiment;
}

const FocusView: React.FC<FocusViewProps> = ({ experiment }) => {
  const { setWorkspaceMode, experiments, comparisonExperimentIds, toggleComparisonExperiment } = useApp();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const completedExperiments = experiments.filter((e) => e.status === 'completed');
  const unsubmittedCount = experiments.filter((e) => e.status === 'not-submitted').length;

  const handleDownloadCSV = () => {
    if (!experiment.result) return;
    
    const csvContent = experiment.result.domains
      .map((domain, i) => `${experiment.result!.coordinates[i].x},${experiment.result!.coordinates[i].y},${domain}`)
      .join('\n');
    
    const blob = new Blob([`x,y,domain\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${experiment.toolName}_clusters.csv`;
    a.click();
  };

  const getStatusInfo = () => {
    switch (experiment.status) {
      case 'not-submitted':
        return { icon: <Schedule />, label: 'Not Submitted', color: '#94A3B8' };
      case 'queued':
        return { icon: <Schedule />, label: 'Queued', color: '#EAB308' };
      case 'running':
        return { icon: <PlayArrow />, label: 'Running', color: '#2563EB' };
      case 'completed':
        return { icon: <Check />, label: 'Completed', color: '#16A34A' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            {experiment.toolName}
          </Typography>
          <Chip
            icon={statusInfo.icon}
            label={statusInfo.label}
            size="small"
            sx={{
              bgcolor: `${statusInfo.color}20`,
              color: statusInfo.color,
              fontWeight: 500,
              '& .MuiChip-icon': { color: statusInfo.color },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {completedExperiments.length > 1 && (
            <ToggleButtonGroup size="small" value="focus" exclusive>
              <ToggleButton value="focus">
                <CenterFocusWeak sx={{ mr: 0.5, fontSize: 18 }} />
                Focus
              </ToggleButton>
              <ToggleButton value="comparison" onClick={() => setWorkspaceMode('comparison')}>
                <GridView sx={{ mr: 0.5, fontSize: 18 }} />
                Compare
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          {experiment.status === 'completed' && (
            <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadCSV} size="small">
              Download CSV
            </Button>
          )}

          {unsubmittedCount > 0 && (
            <Button variant="contained" onClick={() => setSubmitModalOpen(true)} size="small">
              Submit ({unsubmittedCount})
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }} className="workspace-scroll">
        {experiment.status === 'completed' && experiment.result ? (
          <SpatialPlot result={experiment.result} height={550} />
        ) : (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              backgroundColor: '#FAFAFA',
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: `${statusInfo.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              {React.cloneElement(statusInfo.icon, { sx: { fontSize: 32, color: statusInfo.color } })}
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {experiment.status === 'not-submitted'
                ? 'Experiment Not Submitted'
                : experiment.status === 'queued'
                ? 'Waiting in Queue'
                : 'Analysis Running'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {experiment.status === 'not-submitted'
                ? 'Submit this experiment to start the analysis'
                : 'Results will appear here once the analysis is complete'}
            </Typography>
          </Paper>
        )}

        {/* Parameters Summary */}
        <Paper sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Experiment Parameters
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(experiment.parameters).map(([key, value]) => (
              <Chip
                key={key}
                label={`${key}: ${value}`}
                size="small"
                variant="outlined"
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Box>
        </Paper>
      </Box>

      <SubmitModal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} />
    </Box>
  );
};

export default FocusView;
