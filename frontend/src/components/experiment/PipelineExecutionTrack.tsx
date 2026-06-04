import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Stepper, Step, StepLabel, Divider } from '@mui/material';
import { ArrowBack, ArrowForward, Add } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { ToolSchema } from '@/types';
import { initializeParameterValues, prepareParametersForSubmission } from '@/utils/parameterUtils';
import ParameterConfig from './ParameterConfig';
import ExperimentSettings from './ExperimentSettings';
import DatasetSelectionBar from './DatasetSelectionBar';
import ToolSelector from './ToolSelector';

const TOOL_WORKFLOW_STORAGE_KEY = 'select-tool-workflow-state-v1';
const steps = ['Select Tool', 'Configure Parameters'];

interface PersistedWorkflowState {
  activeStep: number;
  selectedToolSchema: ToolSchema | null;
  parameters: Record<string, any>;
  numberOfRuns: number;
}

interface PipelineExecutionTrackProps {
  availableDatasets: Array<{ id: string; name: string }>;
  onStepVisibilityChange: (showTabs: boolean) => void;
}

const PipelineExecutionTrack: React.FC<PipelineExecutionTrackProps> = ({
  availableDatasets,
  onStepVisibilityChange,
}) => {
  const {
    createExperiment,
    selectedDatasetIds,
    focusDatasetId,
    setSelectedDatasetIds,
    setFocusDatasetId,
    resetParameterDrafts,
  } = useApp();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedToolSchema, setSelectedToolSchema] = useState<ToolSchema | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [numberOfRuns, setNumberOfRuns] = useState(1);

  useEffect(() => {
    const savedState = window.sessionStorage.getItem(TOOL_WORKFLOW_STORAGE_KEY);
    if (!savedState) {
      return;
    }

    try {
      const parsed = JSON.parse(savedState) as PersistedWorkflowState;
      setActiveStep(parsed.activeStep ?? 0);
      setSelectedToolSchema(parsed.selectedToolSchema ?? null);
      setParameters(parsed.parameters ?? {});
      setNumberOfRuns(parsed.numberOfRuns ?? 1);
    } catch {
      window.sessionStorage.removeItem(TOOL_WORKFLOW_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const toPersist: PersistedWorkflowState = {
      activeStep,
      selectedToolSchema,
      parameters,
      numberOfRuns,
    };

    window.sessionStorage.setItem(TOOL_WORKFLOW_STORAGE_KEY, JSON.stringify(toPersist));
  }, [activeStep, selectedToolSchema, parameters, numberOfRuns]);

  useEffect(() => {
    onStepVisibilityChange(activeStep === 0);
  }, [activeStep, onStepVisibilityChange]);

  const handleToolSelect = useCallback((schema: ToolSchema) => {
    setSelectedToolSchema(schema);
    setParameters(initializeParameterValues(schema));
    resetParameterDrafts();
  }, [resetParameterDrafts]);

  const handleCreateExperiment = useCallback(() => {
    if (!selectedToolSchema) {
      return;
    }

    const preparedParams = prepareParametersForSubmission(selectedToolSchema, parameters);

    createExperiment(
      selectedToolSchema.tool_id,
      preparedParams,
      selectedToolSchema.label,
      numberOfRuns,
      selectedDatasetIds,
      selectedToolSchema.requirements,
    );
  }, [createExperiment, numberOfRuns, parameters, selectedDatasetIds, selectedToolSchema]);

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
            onClick={() => setActiveStep((previous) => previous - 1)}
            disabled={activeStep === 0}
          >
            Back
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => setActiveStep((previous) => previous + 1)}
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