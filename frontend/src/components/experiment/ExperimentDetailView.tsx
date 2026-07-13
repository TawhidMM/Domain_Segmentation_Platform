import React, { useMemo, useState, useCallback } from 'react';
import { Box, Typography, Button, Chip, Paper, IconButton, Tooltip, Alert } from '@mui/material';
import { Refresh, ArrowBack, OpenInNew } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useDatasetStore } from '@/stores/dataset';
import { usePipelineStore } from '@/stores/pipeline';
import { Experiment, countRunsByStatus, RunStatusValueFrontend, ExperimentStatus } from '@/types';
import SubmitModal from '@/components/modals/SubmitModal';
import DatasetAnnotationTable from './DatasetAnnotationTable';
import DatasetRunsTable from './DatasetRunsTable';
import { useExperimentPolling } from '@/hooks/useExperimentPolling';
import { fetchExperimentDetails, mapDetailsToRuns } from '@/services/experimentService';
import { checkDependsOn } from '@/utils/dependsOn';
import { resolveDatasetParameters } from '@/utils/parameterUtils';
import { toolService } from '@/services/toolService';

interface ExperimentDetailViewProps {
  experiment: Experiment;
}

const ExperimentDetailView: React.FC<ExperimentDetailViewProps> = ({ experiment }) => {
  const uploadedDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const updateExperimentRuns = usePipelineStore((state) => state.updateExperimentRuns);
  const updateExperimentStatus = usePipelineStore((state) => state.updateExperimentStatus);
  const {
    experiments,
    datasetAnnotationMap,
    setSelectedDatasetIds,
    setActiveExperiment,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [, setParamsDialogOpen] = useState(false);
  const [, setParamsDialogDataset] = useState<{ id: string; name: string; params: Record<string, unknown> } | null>(null);

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
        name: uploadedDatasets.find((dataset) => dataset.datasetId === datasetId)?.datasetName ?? datasetId,
        annotationId: datasetAnnotationMap[datasetId],
      })),
    [datasetAnnotationMap, experiment.datasetIds, uploadedDatasets]
  );

  // Group runs by dataset for rendering
  const runsByDataset = useMemo(() => {
    const groups: Record<string, { name: string; runs: any[] }> = {};
    if (!experiment.runs) return groups;

    experiment.runs.forEach((run) => {
      if (!groups[run.datasetId]) {
        groups[run.datasetId] = {
          name: uploadedDatasets.find((d) => d.datasetId === run.datasetId)?.datasetName ?? run.datasetId,
          runs: [],
        };
      }
      groups[run.datasetId].runs.push(run);
    });
    return groups;
  }, [experiment.runs, uploadedDatasets]);

  // Get aggregate run status for header chips
  const runStatusCounts: RunStatusValueFrontend = useMemo(
    () => countRunsByStatus(experiment.runs),
    [experiment.runs]
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

  const handleViewParams = (datasetId: string) => {
    const datasetName = uploadedDatasets.find((d) => d.datasetId === datasetId)?.datasetName ?? datasetId;
    // Use the single resolver function for consistent parameter lookup
    const params = resolveDatasetParameters(datasetId, experiment.datasetParams, experiment.parameters);
    setParamsDialogDataset({ id: datasetId, name: datasetName, params });
    setParamsDialogOpen(true);
  };


  const pollExperimentDetails = useCallback(async () => {
    if (!experiment.experimentId || !experiment.accessToken) return;
    try {
      const experimentDetails = await fetchExperimentDetails(experiment.experimentId, experiment.accessToken);
      const runs = mapDetailsToRuns(experimentDetails, experiment.seedList);
      updateExperimentRuns(experiment.id, runs);
      updateExperimentStatus(experiment.id, experimentDetails.experiment_status as ExperimentStatus);
    } catch (error) {
      console.error('Failed to poll experiment details:', error);
    }
  }, [experiment.experimentId, experiment.accessToken, experiment.id, experiment.seedList, updateExperimentRuns, updateExperimentStatus]);

  // Hook-driven polling: starts when status is queued/running, stops on completed/failed
  // Pass pollFn only when we have runs to update
  const { manualRefresh, isPolling } = useExperimentPolling({
    experimentId: experiment.experimentId,
    accessToken: experiment.accessToken,
    status: experiment.status,
    pollFn: experiment.runs && experiment.runs.length > 0 ? pollExperimentDetails : undefined,
  });

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
  const toolName = experiment.displayName ?? experiment.toolName;

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
            {toolName}
          </Typography>
          {/* Run status aggregate chips */}
          {experiment.runs && experiment.runs.length > 0 && (
            <>
              {runStatusCounts.running > 0 && (
                <Chip size="small" label={`${runStatusCounts.running} running`} sx={{ bgcolor: '#DBEAFE', color: '#2563EB' }} />
              )}
              {runStatusCounts.queued > 0 && (
                <Chip size="small" label={`${runStatusCounts.queued} queued`} sx={{ bgcolor: '#FEF3C7', color: '#D97706' }} />
              )}
              {runStatusCounts.completed > 0 && (
                <Chip size="small" label={`${runStatusCounts.completed} completed`} sx={{ bgcolor: '#DCFCE7', color: '#16A34A' }} />
              )}
              {runStatusCounts.failed > 0 && (
                <Chip size="small" label={`${runStatusCounts.failed} failed`} sx={{ bgcolor: '#FEE2E2', color: '#DC2626' }} />
              )}
              <Chip size="small" label={`${runStatusCounts.total} total`} sx={{ bgcolor: '#F3F4F6', color: '#6B7280' }} />
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {experiment.status === 'not-submitted' && (
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleEditParameters} size="small">
              Edit Parameters
            </Button>
          )}

          {(experiment.status === 'queued' || experiment.status === 'running') && (
            <Tooltip title="Refresh status">
              <span>
                <IconButton size="small" onClick={manualRefresh}>
                  <Refresh fontSize="small" className={isPolling ? 'animate-spin' : ''} />
                </IconButton>
              </span>
            </Tooltip>
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
        {/* Show annotation table if annotation-required tool */}
        {shouldRequireAnnotation && (
          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="warning">
              This experiment requires manual annotation before submission. Annotate every dataset below, then submit.
            </Alert>
            <DatasetAnnotationTable items={annotationDatasetItems} onAnnotate={handleAnnotateDataset} />
          </Box>
        )}

        {/* Per-dataset run tables */}
        {Object.entries(runsByDataset).map(([datasetId, data]) => (
          <Box key={datasetId} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => handleViewParams(datasetId)}
              >
                View Params
              </Button>
            </Box>
            <DatasetRunsTable
              datasetId={datasetId}
              datasetName={data.name}
              runs={data.runs}
              accessToken={experiment.accessToken ?? ''}
              experimentId={experiment.experimentId ?? ''}
            />
          </Box>
        ))}

        {/* Parameters Summary - only show if no runs exist */}
        {(!experiment.runs || experiment.runs.length === 0) && (
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
        )}
      </Box>

      <SubmitModal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} />
    </Box>
  );
};

export default ExperimentDetailView;