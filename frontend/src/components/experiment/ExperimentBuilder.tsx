import React, { useState } from 'react';
import { Box, Button, Stepper, Step, StepLabel, Paper } from '@mui/material';
import { ArrowBack, ArrowForward, Add } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { ToolSchema } from '@/types';
import { initializeParameterValues, prepareParametersForSubmission, validateParameterValues } from '@/utils/parameterUtils';
import ToolSelector from './ToolSelector';
import ParameterConfig from './ParameterConfig';
import ExperimentSettings from './ExperimentSettings';

const ExperimentBuilder: React.FC = () => {
  const { createExperiment } = useApp();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedToolSchema, setSelectedToolSchema] = useState<ToolSchema | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [numberOfRuns, setNumberOfRuns] = useState(1);

  const handleToolSelect = (schema: ToolSchema) => {
    setSelectedToolSchema(schema);
    // Initialize parameters with default values from schema
    const defaultParams = initializeParameterValues(schema);
    setParameters(defaultParams);
  };

  const handleNumberOfRunsChange = (value: number) => {
    setNumberOfRuns(value);
  };

  const handleCreateExperiment = () => {
    if (selectedToolSchema) {
      // Validate parameters
      // const validation = validateParameterValues(selectedToolSchema, parameters);
      // if (!validation.valid) {
      //   console.error('Validation errors:', validation.errors);
      //   alert(`Please fix the following errors:\n${validation.errors.join('\n')}`);
      //   return;
      // }

      // Prepare parameters (expand float_range, etc.)
      const preparedParams = prepareParametersForSubmission(selectedToolSchema, parameters);
      
      createExperiment(selectedToolSchema.tool_id, preparedParams, selectedToolSchema.label, numberOfRuns);
    }
  };

  const steps = ['Select Tool', 'Configure Parameters'];

  const handleChangeTool = () => {
    setActiveStep(0);
  };

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
              {/* Tool Parameters Section */}
              <ParameterConfig toolSchema={selectedToolSchema} values={parameters} onChange={setParameters} />

              {/* Experiment Settings Card */}
              <ExperimentSettings numberOfRuns={numberOfRuns} onChange={handleNumberOfRunsChange} />
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
              disabled={!selectedToolSchema}
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
