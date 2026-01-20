import React, { useState, useMemo } from 'react';
import { Box, Button, Divider, Stepper, Step, StepLabel, Paper } from '@mui/material';
import { ArrowBack, ArrowForward, Add } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { getToolById } from '@/data/toolConfigs';
import { ParameterValue } from '@/types';
import ToolSelector from './ToolSelector';
import ParameterConfig from './ParameterConfig';

const ExperimentBuilder: React.FC = () => {
  const { createExperiment } = useApp();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<ParameterValue>({});

  const selectedTool = useMemo(() => {
    if (!selectedToolId) return null;
    return getToolById(selectedToolId);
  }, [selectedToolId]);

  const handleToolSelect = (toolId: string) => {
    setSelectedToolId(toolId);
    const tool = getToolById(toolId);
    if (tool) {
      // Initialize parameters with default values
      const defaultParams: ParameterValue = {};
      tool.parameters.forEach((param) => {
        defaultParams[param.id] = param.defaultValue;
      });
      setParameters(defaultParams);
    }
  };

  const handleCreateExperiment = () => {
    if (selectedToolId && selectedTool) {
      createExperiment(selectedToolId, parameters);
    }
  };

  const steps = ['Select Tool', 'Configure Parameters'];

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mb: 3 }}>
        {activeStep === 0 && <ToolSelector selectedToolId={selectedToolId} onSelectTool={handleToolSelect} />}

        {activeStep === 1 && selectedTool && (
          <ParameterConfig parameters={selectedTool.parameters} values={parameters} onChange={setParameters} />
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

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
            disabled={!selectedToolId}
          >
            Continue
          </Button>
        ) : (
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateExperiment} disabled={!selectedToolId}>
            Create Experiment
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ExperimentBuilder;
