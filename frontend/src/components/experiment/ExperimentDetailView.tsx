import React, { useMemo, useState, useCallback } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Button, Chip, Paper, IconButton, Tooltip, Alert } from '@mui/material';
import { Download, GridView, CenterFocusWeak, Schedule, PlayArrow, Check, Refresh, RotateRight, FlipToFront, Flip, ArrowBack, OpenInNew } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { useUIStore } from '@/store/useUIStore';
import { Experiment } from '@/types';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import SubmitModal from '@/components/modals/SubmitModal';
import DatasetAnnotationTable from './DatasetAnnotationTable';
import { checkDependsOn } from '@/utils/dependsOn';
import { toolService } from '@/services/toolService';

interface ExperimentDetailViewProps {
  experiment: Experiment;
}

const ExperimentDetailView: React.FC<ExperimentDetailViewProps> = ({ experiment }) => {
  const successfulDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const {
    experiments,
    datasetAnnotationMap,
    setSelectedDatasetIds,
    setActiveExperiment,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    a.download = `${experiment.displayName ?? experiment.toolName}_clusters.csv`;
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


  const handleEditParameters = useCallback(async () => {
    // Check if the tool schema is already available in the pipeline store
    // If not, fetch it for proper parameter rendering
    const pipelineStore = usePipelineStore.getState();
    let toolSchema = pipelineStore.configuration.selectedToolSchema;

    if (!toolSchema || toolSchema.tool_id !== experiment.toolId) {
      toolSchema = await toolService.fetchToolSchema(experiment.toolId);
    }

    // Use the atomic action to load experiment for editing
    // This handles setting the configuration and switching to builder view atomically
    pipelineStore.loadExperimentForEditing(experiment, toolSchema);

    // Restore selected datasets using context setter
    setSelectedDatasetIds(experiment.datasetIds);

    // Clear active experiment to ensure we don't stay in focus mode
    // This is needed because MainWorkspace checks activeExperimentId
    setActiveExperiment(null);
  }, [experiment, setSelectedDatasetIds, setActiveExperiment]);

  // Use displayName if available, otherwise fall back to toolName
  const displayText = experiment.displayName ?? experiment.toolName;

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
            {displayText}
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
          {experiment.status === 'not-submitted' && (
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleEditParameters} size="small">
              Edit Parameters
            </Button>
          )}

          {unsubmittedCount > 0 && (
            <Button variant="contained" onClick={() => setSubmitModalOpen(true)} size="small" disabled={!allRequiredDatasetsAnnotated}>
              Submit ({unsubmittedCount})
            </Button>
          )}

          {experiment.experimentId && experiment.accessToken && (
            <Button
              variant="outlined"
              startIcon={<OpenInNew />}
              onClick={() =>
                window.open(
                  `${window.location.origin}/experiment/${experiment.experimentId}?t=${experiment.accessToken}`,
                  '_blank'
                )
              }
              size="small"
            >
              Open Result Page
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

export default ExperimentDetailView;