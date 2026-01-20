import React, { useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import { ExpandMore, Info } from '@mui/icons-material';
import { ParameterConfig as ParameterConfigType, ParameterValue } from '@/types';

interface ParameterConfigProps {
  parameters: ParameterConfigType[];
  values: ParameterValue;
  onChange: (values: ParameterValue) => void;
}

const ParameterInput: React.FC<{
  param: ParameterConfigType;
  value: number | string | boolean;
  onChange: (value: number | string | boolean) => void;
}> = ({ param, value, onChange }) => {
  switch (param.type) {
    case 'slider':
      return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight={500}>
                {param.label}
              </Typography>
              {param.description && (
                <Tooltip title={param.description} arrow>
                  <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                </Tooltip>
              )}
            </Box>
            <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
              {value}
            </Typography>
          </Box>
          <Slider
            value={value as number}
            onChange={(_, newValue) => onChange(newValue as number)}
            min={param.min}
            max={param.max}
            step={param.step}
            marks={[
              { value: param.min!, label: String(param.min) },
              { value: param.max!, label: String(param.max) },
            ]}
          />
        </Box>
      );

    case 'number':
      return (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {param.label}
            </Typography>
            {param.description && (
              <Tooltip title={param.description} arrow>
                <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
          <TextField
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            size="small"
            fullWidth
            inputProps={{ min: param.min, max: param.max, step: param.step }}
          />
        </Box>
      );

    case 'select':
      return (
        <FormControl fullWidth size="small">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {param.label}
            </Typography>
            {param.description && (
              <Tooltip title={param.description} arrow>
                <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
              </Tooltip>
            )}
          </Box>
          <Select value={value} onChange={(e) => onChange(e.target.value)}>
            {param.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    case 'checkbox':
      return (
        <FormControlLabel
          control={
            <Checkbox checked={value as boolean} onChange={(e) => onChange(e.target.checked)} color="primary" />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2">{param.label}</Typography>
              {param.description && (
                <Tooltip title={param.description} arrow>
                  <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                </Tooltip>
              )}
            </Box>
          }
        />
      );

    default:
      return null;
  }
};

const ParameterConfigComponent: React.FC<ParameterConfigProps> = ({ parameters, values, onChange }) => {
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const basicParams = parameters.filter((p) => !p.advanced);
  const advancedParams = parameters.filter((p) => p.advanced);

  const handleParamChange = (paramId: string, value: number | string | boolean) => {
    onChange({ ...values, [paramId]: value });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Configure Parameters
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Adjust the analysis parameters to optimize results for your data
      </Typography>

      {/* Basic Parameters */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
        {basicParams.map((param) => (
          <ParameterInput
            key={param.id}
            param={param}
            value={values[param.id]}
            onChange={(value) => handleParamChange(param.id, value)}
          />
        ))}
      </Box>

      {/* Advanced Parameters */}
      {advancedParams.length > 0 && (
        <Accordion
          expanded={advancedExpanded}
          onChange={() => setAdvancedExpanded(!advancedExpanded)}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" fontWeight={600}>
              Advanced Parameters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {advancedParams.map((param) => (
                <ParameterInput
                  key={param.id}
                  param={param}
                  value={values[param.id]}
                  onChange={(value) => handleParamChange(param.id, value)}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default ParameterConfigComponent;
