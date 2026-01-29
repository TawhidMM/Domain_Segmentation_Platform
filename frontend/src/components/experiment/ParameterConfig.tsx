import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  Chip,
  Button,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Info, Add, Close, Tune } from '@mui/icons-material';
import { ToolSchema, ToolParameterSchema, DependsOnCondition, FloatRangeDefault } from '@/types';
import { applyDependentDefaults } from '@/utils/parameterUtils';

interface ParameterConfigProps {
  toolSchema: ToolSchema;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

// Helper function to check if a parameter should be visible based on depends_on
const shouldShowParameter = (
  depends_on: DependsOnCondition | undefined,
  currentValues: Record<string, any>
): boolean => {
  if (!depends_on) return true;

  return Object.entries(depends_on).every(([paramKey, allowedValues]) => {
    const currentValue = currentValues[paramKey];
    return allowedValues.includes(String(currentValue));
  });
};

// Integer parameter input
const IntegerInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: number;
  onChange: (value: number) => void;
}> = ({ paramKey, param, value, onChange }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {param.label}
        </Typography>
        <Tooltip title={`Type: ${param.type}`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <TextField
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        size="small"
        fullWidth
        inputProps={{ 
          min: param.min, 
          max: param.max,
          step: 1
        }}
      />
    </Box>
  );
};

// Float parameter input
const FloatInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: number;
  onChange: (value: number) => void;
}> = ({ paramKey, param, value, onChange }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {param.label}
        </Typography>
        <Tooltip title={`Type: ${param.type}`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <TextField
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        size="small"
        fullWidth
        inputProps={{ 
          min: param.min, 
          max: param.max,
          step: 0.01
        }}
      />
    </Box>
  );
};

// Enum parameter (dropdown)
const EnumInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: string;
  onChange: (value: string) => void;
}> = ({ paramKey, param, value, onChange }) => {
  return (
    <FormControl fullWidth size="small">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {param.label}
        </Typography>
        <Tooltip title={`Type: ${param.type}`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Select value={value} onChange={(e) => onChange(e.target.value as string)}>
        {param.options?.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

// Boolean parameter (checkbox)
const BoolInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ paramKey, param, value, onChange }) => {
  return (
    <FormControlLabel
      control={
        <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} color="primary" />
      }
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2">{param.label}</Typography>
          <Tooltip title={`Type: ${param.type}`} arrow>
            <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
          </Tooltip>
        </Box>
      }
    />
  );
};

// Float range input (min, max, step)
const FloatRangeInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: FloatRangeDefault;
  onChange: (value: FloatRangeDefault) => void;
}> = ({ paramKey, param, value, onChange }) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {param.label}
        </Typography>
        <Tooltip title={`Type: ${param.type} - Generates array from min to max with step`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="Min"
          type="number"
          value={value.min}
          onChange={(e) => onChange({ ...value, min: Number(e.target.value) })}
          size="small"
          inputProps={{ step: 0.01 }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Max"
          type="number"
          value={value.max}
          onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
          size="small"
          inputProps={{ step: 0.01 }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Step"
          type="number"
          value={value.step}
          onChange={(e) => onChange({ ...value, step: Number(e.target.value) })}
          size="small"
          inputProps={{ step: 0.01 }}
          sx={{ flex: 1 }}
        />
      </Box>
    </Box>
  );
};

// Integer list input (tag-style)
const IntListInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: number[];
  onChange: (value: number[]) => void;
}> = ({ paramKey, param, value, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const num = Number(inputValue);
    if (inputValue && !isNaN(num) && !value.includes(num)) {
      onChange([...value, num]);
      setInputValue('');
    }
  };

  const handleDelete = (numToDelete: number) => {
    onChange(value.filter((num) => num !== numToDelete));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {param.label}
        </Typography>
        <Tooltip title={`Type: ${param.type} - Add multiple integer values`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          placeholder="Enter value and press Enter"
          fullWidth
        />
        <IconButton size="small" onClick={handleAdd} color="primary">
          <Add />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {value.map((num) => (
          <Chip
            key={num}
            label={num}
            onDelete={() => handleDelete(num)}
            size="small"
            deleteIcon={<Close />}
          />
        ))}
      </Box>
    </Box>
  );
};

// Float list input (tag-style)
const FloatListInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: number[];
  onChange: (value: number[]) => void;
}> = ({ paramKey, param, value, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const num = Number(inputValue);
    if (inputValue && !isNaN(num) && !value.includes(num)) {
      onChange([...value, num]);
      setInputValue('');
    }
  };

  const handleDelete = (numToDelete: number) => {
    onChange(value.filter((num) => num !== numToDelete));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {param.label}
        </Typography>
        <Tooltip title={`Type: ${param.type} - Add multiple float values`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          placeholder="Enter value and press Enter"
          fullWidth
          inputProps={{ step: 0.01 }}
        />
        <IconButton size="small" onClick={handleAdd} color="primary">
          <Add />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {value.map((num) => (
          <Chip
            key={num}
            label={num}
            onDelete={() => handleDelete(num)}
            size="small"
            deleteIcon={<Close />}
          />
        ))}
      </Box>
    </Box>
  );
};

// Main parameter input renderer
const ParameterInput: React.FC<{
  paramKey: string;
  param: ToolParameterSchema;
  value: any;
  onChange: (value: any) => void;
}> = ({ paramKey, param, value, onChange }) => {
  switch (param.type) {
    case 'int':
      return <IntegerInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    case 'float':
      return <FloatInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    case 'enum':
      return <EnumInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    case 'bool':
      return <BoolInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    case 'float_range':
      return <FloatRangeInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    case 'int_list':
      return <IntListInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    case 'float_list':
      return <FloatListInput paramKey={paramKey} param={param} value={value} onChange={onChange} />;
    default:
      return null;
  }
};

const ParameterConfigComponent: React.FC<ParameterConfigProps> = ({ toolSchema, values, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleParamChange = (paramKey: string, value: any) => {
    const nextValues = { ...values, [paramKey]: value };
    const updatedValues = applyDependentDefaults(toolSchema, values, nextValues, paramKey);
    onChange(updatedValues);
  };

  // Separate parameters into basic and advanced
  const basicParams = Object.entries(toolSchema.parameters).filter(
    ([_, param]) => param.ui_group === 'basic'
  );
  const advancedParams = Object.entries(toolSchema.parameters).filter(
    ([_, param]) => param.ui_group === 'advanced'
  );
  const hasAdvanced = advancedParams.length > 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Configure Parameters
        </Typography>

        {hasAdvanced && (
          <Button
            size="small"
            variant={showAdvanced ? 'outlined' : 'contained'}
            color="warning"
            startIcon={<Tune fontSize="small" />}
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Hide advanced' : 'Show advanced'}
          </Button>
        )}
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Adjust the analysis parameters to optimize results for your data
      </Typography>

      {/* Side-by-side layout for basic and advanced parameters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {/* Basic Parameters Section */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
            Basic Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {basicParams.map(([paramKey, param]) => {
              // Check if parameter should be visible based on depends_on
              if (!shouldShowParameter(param.depends_on, values)) {
                return null;
              }

              return (
                <ParameterInput
                  key={paramKey}
                  paramKey={paramKey}
                  param={param}
                  value={values[paramKey]}
                  onChange={(value) => handleParamChange(paramKey, value)}
                />
              );
            })}
          </Box>
        </Box>

        {/* Advanced Parameters Section - Always rendered */}
        {hasAdvanced && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              backgroundColor: showAdvanced ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.01)',
              border: '1px solid',
              borderColor: showAdvanced ? 'divider' : 'rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease-in-out',
              opacity: showAdvanced ? 1 : 0.4,
              cursor: showAdvanced ? 'default' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': !showAdvanced ? {
                opacity: 0.6,
                borderColor: 'rgba(0, 0, 0, 0.1)',
              } : {},
            }}
            onClick={!showAdvanced ? () => setShowAdvanced(true) : undefined}
          >
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600, 
                mb: 2, 
                color: showAdvanced ? 'warning.main' : 'text.disabled',
                transition: 'color 0.3s ease-in-out',
              }}
            >
              Advanced Settings
            </Typography>
            
            {!showAdvanced && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Tune sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.3 }} />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Click to expand
                </Typography>
              </Box>
            )}

            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 3,
                opacity: showAdvanced ? 1 : 0,
                transform: showAdvanced ? 'translateY(0)' : 'translateY(-10px)',
                transition: 'all 0.3s ease-in-out',
                pointerEvents: showAdvanced ? 'auto' : 'none',
              }}
            >
              {advancedParams.map(([paramKey, param]) => {
                // Check if parameter should be visible based on depends_on
                if (!shouldShowParameter(param.depends_on, values)) {
                  return null;
                }

                return (
                  <ParameterInput
                    key={paramKey}
                    paramKey={paramKey}
                    param={param}
                    value={values[paramKey]}
                    onChange={(value) => handleParamChange(paramKey, value)}
                  />
                );
              })}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ParameterConfigComponent;
