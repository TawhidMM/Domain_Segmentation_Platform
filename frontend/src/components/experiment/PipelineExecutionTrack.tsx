import React, { useCallback, useMemo, useState } from 'react';
import { v4 as uuid4 } from 'uuid';
import { Box, Button, Stepper, Step, StepLabel, Divider, Tooltip, Paper, Typography, IconButton } from '@mui/material';
import { ArrowBack, ArrowForward, Add, Edit } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { usePipelineStore } from '@/stores/pipeline';
import { useExperimentsStore } from '@/stores/experiments';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import { ToolSchema, Experiment, ExperimentStatus, WorkspaceView } from '@/types';
import { prepareParametersForSubmission } from '@/utils/parameterUtils';
import ParameterConfig from './ParameterConfig';
import DatasetSelectionBar from './DatasetSelectionBar';
import ToolSelector from './ToolSelector';
import SeedConfigDialog from './SeedConfigDialog';

const steps = ['Select Tool', 'Configure Parameters'];

interface PipelineExecutionTrackProps {
  availableDatasets: Array<{ id: string; name: string }>;
}

const PipelineExecutionTrack: React.FC<PipelineExecutionTrackProps> = ({ availableDatasets }) => {
  const {
    resetDatasetParamOverrides,
    selectedDatasetIds,
    focusDatasetId,
    setSelectedDatasetIds,
    setFocusDatasetId,
  } = useApp();

  const setWorkspaceView = useUIStore((state) => state.setWorkspaceView);
  
  // Get config from pipeline store
  const configuration = usePipelineStore((state) => state.configuration);
  const activeStep = usePipelineStore((state) => state.activeStep);
  const setSelectedTool = usePipelineStore((state) => state.setSelectedTool);
  const setParameters = usePipelineStore((state) => state.setParameters);
  const setSeedList = usePipelineStore((state) => state.setSeedList);
  const setActiveStep = usePipelineStore((state) => state.setActiveStep);
  const handleStepBack = usePipelineStore((state) => state.handleStepBack);
  const recordCreatedExperiment = usePipelineStore((state) => state.recordCreatedExperiment);
  const addExperiment = useExperimentsStore((state) => state.addExperiment);
  const updateExperiment = useExperimentsStore((state) => state.updateExperiment);
  const editingExperimentId = usePipelineStore((state) => state.editingExperimentId);


  const selectedToolSchema = configuration.selectedToolSchema;
  const parameters = configuration.parameters;
  const seedList = configuration.seedList;

  const [seedDialogOpen, setSeedDialogOpen] = useState(false);

  const handleToolSelect = useCallback((schema: ToolSchema) => {
    setSelectedTool(schema);
    resetDatasetParamOverrides();
  }, [resetDatasetParamOverrides, setSelectedTool]);

  const handleCreateExperiment = useCallback(() => {
    if (!selectedToolSchema) {
      return;
    }

    const preparedParams = prepareParametersForSubmission(selectedToolSchema, parameters);

    if (editingExperimentId) {
      // Update the existing experiment in-place instead of creating a new one
      updateExperiment(editingExperimentId, {
        parameters: preparedParams,
        seedList,
        numberOfRuns: seedList.length,
        datasetIds: selectedDatasetIds,
      });

      // Clear editing state so next save creates a new experiment
      usePipelineStore.setState({ editingExperimentId: null });
    } else {
      // Record the snapshot BEFORE creating experiment, so it's persisted even if refresh happens
      recordCreatedExperiment({
        toolId: selectedToolSchema.tool_id,
        parameters: preparedParams,
        toolLabel: selectedToolSchema.label,
        numberOfRuns: seedList.length,
        seedList,
        datasetIds: selectedDatasetIds,
        requirements: selectedToolSchema.requirements,
        createdAt: Date.now(),
      });

      // Create the experiment object and add it to the pipeline store
      const experiment: Experiment = {
        id: uuid4(),
        toolId: selectedToolSchema.tool_id,
        experimentName: selectedToolSchema.label,
        datasetIds: selectedDatasetIds,
        requirements: selectedToolSchema.requirements,
        parameters: preparedParams,
        numberOfRuns: seedList.length,
        seedList,
        status: ExperimentStatus.NOT_SUBMITTED,
        createdAt: new Date(),
        completedAt: null,
        result: null,
        metrics: null,
        toolSchema: selectedToolSchema,
      };

      addExperiment(experiment);
    }
    // Switch to focus view after creating/updating experiment
    setWorkspaceView(WorkspaceView.FOCUS);
  }, [
    selectedToolSchema,
    parameters,
    seedList,
    selectedDatasetIds,
    editingExperimentId,
    recordCreatedExperiment,
    addExperiment,
    updateExperiment,
    setWorkspaceView,
  ]);

  const focusedDatasetName = useMemo(
    () => availableDatasets.find((dataset) => dataset.id === focusDatasetId)?.name ?? null,
    [availableDatasets, focusDatasetId]
  );

  // Check if all seeds are valid (positive integers)
  const allSeedsValid = seedList.length > 0 && seedList.every((s) => Number.isInteger(s) && s > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Typography
          component="a"
          href="/how-to-use#creating-analysis"
          target="_blank"
          rel="noopener"
          variant="caption"
          sx={{
            color: 'primary.main',
            textDecoration: 'none',
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          How to Create Analysis ?
        </Typography>
      </Box>

      {activeStep === 0 && (
        <ToolSelector selectedToolId={selectedToolSchema?.tool_id ?? null} onSelectTool={handleToolSelect} />
      )}

      {activeStep === 1 && selectedToolSchema && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <DatasetSelectionBar
            availableDatasets={availableDatasets}
            selectedDatasetIds={selectedDatasetIds}
            focusDatasetId={focusDatasetId}
            onSelectionChange={(datasetIds, nextFocusDatasetId) => {
              setSelectedDatasetIds(datasetIds);
              setFocusDatasetId(nextFocusDatasetId);
            }}
            disabled={availableDatasets.length === 0}
          />

          <Divider />

          {/* Experiment Settings - Seed Configuration (global) */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              backgroundColor: 'rgba(25, 103, 210, 0.02)',
              border: '1px solid',
              borderColor: seedList.length === 0 ? 'error.main' : 'primary.light',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: seedList.length === 0 ? 'rgba(211, 47, 47, 0.04)' : 'rgba(25, 103, 210, 0.04)',
              },
            }}
            onClick={() => setSeedDialogOpen(true)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Global Settings
                </Typography>
                <Typography variant="caption" sx={{ color: seedList.length === 0 ? 'error.main' : 'text.secondary' }}>
                  {seedList.length === 0 
                    ? 'Required: Set seeds to create experiment' 
                    : `${seedList.length} run${seedList.length !== 1 ? 's' : ''} configured`}
                </Typography>
              </Box>
              <IconButton size="small" color={seedList.length === 0 ? 'error' : 'primary'}>
                <Edit fontSize="small" />
              </IconButton>
            </Box>
          </Paper>

          {/* Seed Edit Dialog */}
          <SeedConfigDialog
            open={seedDialogOpen}
            onClose={() => setSeedDialogOpen(false)}
            seedList={seedList}
            onSeedChange={setSeedList}
          />

          {selectedDatasetIds.length > 0 ? (
            <ParameterConfig
              toolSchema={selectedToolSchema}
              values={parameters}
              onChange={setParameters}
              selectedDatasetIds={selectedDatasetIds}
              focusDatasetId={focusDatasetId}
              focusDatasetName={focusedDatasetName}
            />
          ) : (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: 'action.hover',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ color: 'text.secondary' }}>
                Select at least one dataset above to configure parameters
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleStepBack}
            >
              Back
            </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={!selectedToolSchema}
            >
              Continue
            </Button>
          ) : (
            <Tooltip title={!allSeedsValid ? "Set seed to create experiment" : undefined}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateExperiment}
                  disabled={!selectedToolSchema || selectedDatasetIds.length === 0 || !allSeedsValid}
                >
                  Create Experiment
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PipelineExecutionTrack;