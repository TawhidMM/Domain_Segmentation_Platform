import React, { useState, useCallback, useMemo } from 'react';
import { Box, Button, Stepper, Step, StepLabel, Paper, Divider } from '@mui/material';
import { ArrowBack, ArrowForward, Add } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { ToolSchema } from '@/types';
import { initializeParameterValues, prepareParametersForSubmission } from '@/utils/parameterUtils';
import ToolSelector from './ToolSelector';
import ParameterConfig from './ParameterConfig';
import ExperimentSettings from './ExperimentSettings';
import DatasetSelectionBar from './DatasetSelectionBar';

const ExperimentBuilder: React.FC = () => {
  const {
    createExperiment,
    successfulDatasets,
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

  const handleToolSelect = useCallback((schema: ToolSchema) => {
    setSelectedToolSchema(schema);
    // Initialize parameters with default values from schema
    const defaultParams = initializeParameterValues(schema);
    setParameters(defaultParams);
    // Reset parameter drafts and dataset selection when changing tool
    resetParameterDrafts();
  }, [resetParameterDrafts]);

  const handleNumberOfRunsChange = useCallback((value: number) => {
    setNumberOfRuns(value);
  }, []);

  const handleDatasetSelectionChange = useCallback((datasetIds: string[], nextFocusDatasetId: string | null) => {
    setSelectedDatasetIds(datasetIds);
    setFocusDatasetId(nextFocusDatasetId);
  }, [setSelectedDatasetIds, setFocusDatasetId]);

  const handleCreateExperiment = useCallback(() => {
    if (selectedToolSchema) {
      // Prepare parameters (expand float_range, etc.)
      const preparedParams = prepareParametersForSubmission(selectedToolSchema, parameters);

      createExperiment(selectedToolSchema.tool_id, preparedParams, selectedToolSchema.label, numberOfRuns);
    }
  }, [selectedToolSchema, parameters, numberOfRuns, createExperiment]);

  // Memoize available datasets for the selection bar
  const availableDatasets = useMemo(
    () =>
      successfulDatasets.map((dataset) => ({
        id: dataset.datasetId || '',
        name: dataset.datasetName,
      })),
    [successfulDatasets]
  );

  const focusedDatasetName = useMemo(
    () => availableDatasets.find((dataset) => dataset.id === focusDatasetId)?.name ?? null,
    [availableDatasets, focusDatasetId]
  );

  const steps = ['Select Tool', 'Configure Parameters'];

  const handleChangeTool = useCallback(() => {
    setActiveStep(0);
  }, []);

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 1200,
        mx: 'auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Paper sx={{ p: 3, mb: 3 }}>
          {activeStep === 0 && <ToolSelector selectedToolId={selectedToolSchema?.tool_id} onSelectTool={handleToolSelect} />}

          {activeStep === 1 && selectedToolSchema && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Dataset Selection Section */}
              <Box>
                <DatasetSelectionBar
                  availableDatasets={availableDatasets}
                  selectedDatasetIds={selectedDatasetIds}
                  focusDatasetId={focusDatasetId}
                  onSelectionChange={handleDatasetSelectionChange}
                  disabled={availableDatasets.length === 0}
                />
              </Box>

              <Divider />

              {/* Tool Parameters Section - Only render when datasets are selected */}
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

              {/* Experiment Settings Card */}
              {selectedDatasetIds.length > 0 && (
                <ExperimentSettings numberOfRuns={numberOfRuns} onChange={handleNumberOfRunsChange} />
              )}
            </Box>
          )}
        </Paper>
      </Box>

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
            onClick={() => setActiveStep((prev) => prev - 1)}
            disabled={activeStep === 0}
          >
            Back
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => setActiveStep((prev) => prev + 1)}
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

export default ExperimentBuilder;
