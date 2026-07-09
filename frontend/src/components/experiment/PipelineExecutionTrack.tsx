import React, { useCallback, useMemo } from 'react';
import { Box, Button, Stepper, Step, StepLabel, Divider } from '@mui/material';
import { ArrowBack, ArrowForward, Add } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { usePipelineStore } from '@/stores/pipeline';
import { useUIStore } from '@/store/useUIStore';
import { ToolSchema } from '@/types';
import { prepareParametersForSubmission } from '@/utils/parameterUtils';
import ParameterConfig from './ParameterConfig';
import ExperimentSettings from './ExperimentSettings';
import DatasetSelectionBar from './DatasetSelectionBar';
import ToolSelector from './ToolSelector';

const steps = ['Select Tool', 'Configure Parameters'];

interface PipelineExecutionTrackProps {
  availableDatasets: Array<{ id: string; name: string }>;
}

const PipelineExecutionTrack: React.FC<PipelineExecutionTrackProps> = ({ availableDatasets }) => {
  const {
    createExperiment,
    setActiveExperiment,
    selectedDatasetIds,
    focusDatasetId,
    setSelectedDatasetIds,
    setFocusDatasetId,
    resetParameterDrafts,
  } = useApp();

  const setWorkspaceView = useUIStore((state) => state.setWorkspaceView);
  const configuration = usePipelineStore((state) => state.configuration);
  const activeStep = usePipelineStore((state) => state.activeStep);
  const setSelectedTool = usePipelineStore((state) => state.setSelectedTool);
  const setParameters = usePipelineStore((state) => state.setParameters);
  const setNumberOfRuns = usePipelineStore((state) => state.setNumberOfRuns);
  const setActiveStep = usePipelineStore((state) => state.setActiveStep);
  const handleStepBack = usePipelineStore((state) => state.handleStepBack);
  const recordCreatedExperiment = usePipelineStore((state) => state.recordCreatedExperiment);

  const selectedToolSchema = configuration.selectedToolSchema;
  const parameters = configuration.parameters;
  const numberOfRuns = configuration.numberOfRuns;

  const handleToolSelect = useCallback((schema: ToolSchema) => {
    setSelectedTool(schema);
    resetParameterDrafts();
  }, [resetParameterDrafts, setSelectedTool]);

  const handleCreateExperiment = useCallback(() => {
    if (!selectedToolSchema) {
      return;
    }

    const preparedParams = prepareParametersForSubmission(selectedToolSchema, parameters);

    // Record the snapshot BEFORE creating experiment, so it's persisted even if refresh happens
    recordCreatedExperiment({
      toolId: selectedToolSchema.tool_id,
      parameters: preparedParams,
      toolLabel: selectedToolSchema.label,
      numberOfRuns,
      datasetIds: selectedDatasetIds,
      requirements: selectedToolSchema.requirements,
      createdAt: Date.now(),
    });

    createExperiment(
      selectedToolSchema.tool_id,
      preparedParams,
      selectedToolSchema.label,
      numberOfRuns,
      selectedDatasetIds,
      selectedToolSchema.requirements,
    );
    
    // Switch to focus view after creating experiment
    setWorkspaceView('focus');
  }, [createExperiment, numberOfRuns, parameters, selectedDatasetIds, selectedToolSchema, recordCreatedExperiment, setWorkspaceView]);

  const focusedDatasetName = useMemo(
    () => availableDatasets.find((dataset) => dataset.id === focusDatasetId)?.name ?? null,
    [availableDatasets, focusDatasetId]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

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

          {selectedDatasetIds.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <ParameterConfig
                toolSchema={selectedToolSchema}
                values={parameters}
                onChange={setParameters}
                selectedDatasetIds={selectedDatasetIds}
                focusDatasetId={focusDatasetId}
                focusDatasetName={focusedDatasetName}
              />

              <ExperimentSettings numberOfRuns={numberOfRuns} onChange={setNumberOfRuns} />
            </Box>
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
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateExperiment}
              disabled={!selectedToolSchema || selectedDatasetIds.length === 0}
            >
              Create Experiment
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PipelineExecutionTrack;