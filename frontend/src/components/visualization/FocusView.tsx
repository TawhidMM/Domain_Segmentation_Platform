import React, { useMemo, useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Button, Chip, Paper, Divider, IconButton, Tooltip, Alert } from '@mui/material';
import { Download, GridView, CenterFocusWeak, Schedule, PlayArrow, Check, Refresh, RotateRight, FlipToFront, Flip } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Experiment } from '@/types';
import SpatialPlot from './SpatialPlot';
import SubmitModal from '../modals/SubmitModal';
import DatasetAnnotationTable from '../experiment/DatasetAnnotationTable';
import { checkDependsOn } from '@/utils/dependsOn';

interface FocusViewProps {
  experiment: Experiment;
}

const FocusView: React.FC<FocusViewProps> = ({ experiment }) => {
  const {
    setWorkspaceMode,
    experiments,
    comparisonExperimentIds,
    toggleComparisonExperiment,
    refreshExperimentResult,
    successfulDatasets,
    datasetAnnotationMap,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);

  const completedExperiments = experiments.filter((e) => e.status === 'completed');
  const unsubmittedCount = experiments.filter((e) => e.status === 'not-submitted').length;

  const annotationRequirement = experiment.requirements?.manual_annotation;
  const shouldRequireAnnotation = Boolean(
    annotationRequirement?.is_required && checkDependsOn(annotationRequirement.depends_on, experiment.parameters)
  );

  const allRequiredDatasetsAnnotated = useMemo(() => {
    if (!shouldRequireAnnotation) {
      return true;
    }

    if (experiment.datasetIds.length === 0) {
      return false;
    }

    return experiment.datasetIds.every((datasetId) => Boolean(datasetAnnotationMap[datasetId]));
  }, [datasetAnnotationMap, experiment.datasetIds, shouldRequireAnnotation]);

  const annotationDatasetItems = useMemo(
    () =>
      experiment.datasetIds.map((datasetId) => ({
        id: datasetId,
        name: successfulDatasets.find((dataset) => dataset.datasetId === datasetId)?.datasetName ?? datasetId,
        annotationId: datasetAnnotationMap[datasetId],
      })),
    [datasetAnnotationMap, experiment.datasetIds, successfulDatasets]
  );

  const handleAnnotateDataset = (datasetId: string, annotationId?: string) => {
    const queryParams: Record<string, string> = {
      dataset_id: datasetId,
      return_to: `${location.pathname}${location.search}`,
    };

    if (annotationId) {
      queryParams.annotation_id = annotationId;
    }

    const query = new URLSearchParams(queryParams);

    navigate(`/annotation-workspace?${query.toString()}`);
  };

  const handleDownloadCSV = () => {
    if (!experiment.result || !experiment.result.spots) return;
    
    const csvContent = experiment.result.spots
      .map((spot) => `${spot.barcode},${spot.x},${spot.y},${spot.domain}`)
      .join('\n');
    
    const blob = new Blob([`barcode,x,y,domain\n${csvContent}`], { type: 'text/csv' });
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

  const handleRefreshResult = async () => {
    if (!experiment.jobId) return;
    setIsRefreshing(true);
    await refreshExperimentResult(experiment.id);
    setIsRefreshing(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleMirrorX = () => {
    setMirrorX((prev) => !prev);
  };

  const handleMirrorY = () => {
    setMirrorY((prev) => !prev);
  };

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
            <>
              <Box sx={{ display: 'flex', gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                <Tooltip title="Rotate 90°">
                  <IconButton size="small" onClick={handleRotate}>
                    <RotateRight fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Mirror Horizontal">
                  <IconButton size="small" onClick={handleMirrorX} color={mirrorX ? 'primary' : 'default'}>
                    <Flip fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Mirror Vertical">
                  <IconButton size="small" onClick={handleMirrorY} color={mirrorY ? 'primary' : 'default'}>
                    <FlipToFront fontSize="small" sx={{ transform: 'rotate(90deg)' }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadCSV} size="small">
                Download CSV
              </Button>
            </>
          )}

          {experiment.jobId && experiment.status !== 'completed' && (
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefreshResult}
              size="small"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing…' : 'Check Result'}
            </Button>
          )}

          {unsubmittedCount > 0 && (
            <Button variant="contained" onClick={() => setSubmitModalOpen(true)} size="small" disabled={!allRequiredDatasetsAnnotated}>
              Submit ({unsubmittedCount})
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }} className="workspace-scroll">
        {shouldRequireAnnotation && (
          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              This experiment requires manual annotation before submission. Annotate every dataset below, then submit.
            </Alert>
            <DatasetAnnotationTable items={annotationDatasetItems} onAnnotate={handleAnnotateDataset} />
          </Box>
        )}

        {experiment.status === 'completed' && experiment.result ? (
          <SpatialPlot
            result={experiment.result}
            metrics={experiment.metrics}
            height={550}
            rotation={rotation}
            mirrorX={mirrorX}
            mirrorY={mirrorY}
          />
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
