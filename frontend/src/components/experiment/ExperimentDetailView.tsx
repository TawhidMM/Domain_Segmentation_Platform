import React, { useState, useCallback } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { Refresh, ArrowBack } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { useExperimentsStore } from '@/stores/experiments';
import { Experiment, ExperimentStatus, countRunsByStatus } from '@/types';
import SubmitModal from '@/components/modals/SubmitModal';
import DatasetAnnotationPanel from './DatasetAnnotationPanel';
import ExperimentMonitoringPanel from './ExperimentMonitoringPanel';
import { useExperimentPolling } from '@/hooks/useExperimentPolling';
import { fetchExperimentDetails, mapDetailsToRuns } from '@/services/experimentService';
import DatasetParamsDialog from './DatasetParamsDialog';
import { usePipelineStore } from "@/stores/pipeline";
import { isExperimentReadyToSubmit } from '@/utils/annotationStatus';

interface ExperimentDetailViewProps {
  experiment: Experiment;
}

const ExperimentDetailView: React.FC<ExperimentDetailViewProps> = ({ experiment }) => {
  const updateExperimentRuns = useExperimentsStore((state) => state.updateExperimentRuns);
  const updateExperimentStatus = useExperimentsStore((state) => state.updateExperimentStatus);
  const {
    experiments,
    setSelectedDatasetIds,
    setActiveExperiment,
  } = useApp();
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [paramsDialogOpen, setParamsDialogOpen] = useState(false);
  const [paramsDialogDataset, setParamsDialogDataset] = useState<{ id: string; name: string; params: Record<string, unknown> } | null>(null);

  const unsubmittedExperiments = experiments.filter((e) => e.status === 'not-submitted');
  const unsubmittedCount = unsubmittedExperiments.length;
  const readyCount = unsubmittedExperiments.filter((e) => isExperimentReadyToSubmit(e)).length;

  const handleViewParams = useCallback((datasetId: string, datasetName: string, params: Record<string, unknown>) => {
    setParamsDialogDataset({ id: datasetId, name: datasetName, params });
    setParamsDialogOpen(true);
  }, []);

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

  const { manualRefresh, isPolling } = useExperimentPolling({
    experimentId: experiment.experimentId,
    accessToken: experiment.accessToken,
    status: experiment.status,
    pollFn: experiment.experimentId && experiment.accessToken ? pollExperimentDetails : undefined,
  });

  const handleEditParameters = useCallback(async () => {
    const pipelineStore = usePipelineStore.getState();
    const toolSchema = experiment.toolSchema;

    pipelineStore.loadExperimentForEditing(experiment, toolSchema);
    setSelectedDatasetIds(experiment.datasetIds);
    setActiveExperiment(null);
  }, [experiment, setSelectedDatasetIds, setActiveExperiment]);

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
          {experiment.runs && experiment.runs.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {(() => {
                const counts = countRunsByStatus(experiment.runs);
                return (
                  <>
                    {counts.running > 0 && (
                      <Chip size="small" label={`${counts.running} running`} sx={{ bgcolor: '#DBEAFE', color: '#2563EB' }} />
                    )}
                    {counts.queued > 0 && (
                      <Chip size="small" label={`${counts.queued} queued`} sx={{ bgcolor: '#FEF3C7', color: '#D97706' }} />
                    )}
                    {counts.completed > 0 && (
                      <Chip size="small" label={`${counts.completed} completed`} sx={{ bgcolor: '#DCFCE7', color: '#16A34A' }} />
                    )}
                    {counts.failed > 0 && (
                      <Chip size="small" label={`${counts.failed} failed`} sx={{ bgcolor: '#FEE2E2', color: '#DC2626' }} />
                    )}
                    <Chip size="small" label={`${counts.total} total`} sx={{ bgcolor: '#F3F4F6', color: '#6B7280' }} />
                  </>
                );
              })()}
            </Box>
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
            <Button variant="contained" onClick={() => setSubmitModalOpen(true)} size="small">
              Submit {readyCount > 0 && readyCount < unsubmittedCount ? `(${readyCount}/${unsubmittedCount})` : `(${readyCount})`}
            </Button>
          )}


        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }} className="workspace-scroll">
        <DatasetAnnotationPanel experiment={experiment} />
        <ExperimentMonitoringPanel
          experiment={experiment}
          onViewParams={handleViewParams}
        />
      </Box>

      <SubmitModal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} />

      {paramsDialogDataset && (
        <DatasetParamsDialog
          open={paramsDialogOpen}
          onClose={() => setParamsDialogOpen(false)}
          datasetName={paramsDialogDataset.name}
          params={paramsDialogDataset.params}
          toolSchema={experiment.toolSchema}
        />
      )}
    </Box>
  );
};

export default ExperimentDetailView;