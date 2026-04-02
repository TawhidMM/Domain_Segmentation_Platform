import React, { useState, useEffect } from 'react';
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
import { checkDependsOn } from '@/utils/dependsOn';
import { useParameterDrafts } from '@/hooks/useParameterDrafts';
import { useApp } from '@/context/AppContext';

interface ParameterConfigProps {
  toolSchema: ToolSchema;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  selectedDatasetIds?: string[];
  focusDatasetId?: string | null;
  focusDatasetName?: string | null;
}

// Helper function to check if a parameter should be visible based on depends_on
const shouldShowParameter = (
  depends_on: DependsOnCondition | undefined,
  currentValues: Record<string, any>
): boolean => {
  return checkDependsOn(depends_on, currentValues);
};

const EMPTY_FLOAT_RANGE: FloatRangeDefault = { min: 0, max: 0, step: 0 };

const useSyncedNumberInput = (value: number, isMultipleValues: boolean) => {
  const [localValue, setLocalValue] = useState<string>(
    isMultipleValues ? '' : String(value ?? '')
  );

  useEffect(() => {
    setLocalValue(isMultipleValues ? '' : String(value ?? ''));
  }, [value, isMultipleValues]);

  return [localValue, setLocalValue] as const;
};



// Integer parameter input
const IntegerInput: React.FC<{
  param: ToolParameterSchema;
  value: number;
  onChange: (value: number) => void;
  onBlur?: (value: number) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  const [localValue, setLocalValue] = useSyncedNumberInput(value, isMultipleValues);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (newVal && !isNaN(Number(newVal))) {
      onChange(Number(newVal));
    }
  };

  const handleBlur = () => {
    if (localValue && !isNaN(Number(localValue))) {
      onBlur?.(Number(localValue));
    }
  };

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
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        size="small"
        fullWidth
        placeholder={isMultipleValues ? 'Multiple values' : undefined}
        inputProps={{
          min: param.min,
          max: param.max,
          step: 1,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            color: isMultipleValues ? 'warning.main' : 'inherit',
            fontWeight: isMultipleValues ? 500 : 400,
          },
          '& .MuiOutlinedInput-input::placeholder': {
            color: 'warning.main',
            opacity: 1,
          },
        }}
      />
    </Box>
  );
};

// Float parameter input
const FloatInput: React.FC<{
  param: ToolParameterSchema;
  value: number;
  onChange: (value: number) => void;
  onBlur?: (value: number) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  const [localValue, setLocalValue] = useSyncedNumberInput(value, isMultipleValues);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (newVal && !isNaN(Number(newVal))) {
      onChange(Number(newVal));
    }
  };

  const handleBlur = () => {
    if (localValue && !isNaN(Number(localValue))) {
      onBlur?.(Number(localValue));
    }
  };

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
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        size="small"
        fullWidth
        placeholder={isMultipleValues ? 'Multiple values' : undefined}
        inputProps={{
          min: param.min,
          max: param.max,
          step: 0.01,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            color: isMultipleValues ? 'warning.main' : 'inherit',
            fontWeight: isMultipleValues ? 500 : 400,
          },
          '& .MuiOutlinedInput-input::placeholder': {
            color: 'warning.main',
            opacity: 1,
          },
        }}
      />
    </Box>
  );
};

// Enum parameter (dropdown)
const EnumInput: React.FC<{
  param: ToolParameterSchema;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
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
      <Select
        value={isMultipleValues ? '' : value}
        onChange={(e) => {
          const newVal = e.target.value as string;
          onChange(newVal);
          onBlur?.(newVal);
        }}
        displayEmpty={isMultipleValues}
        sx={{
          color: isMultipleValues ? 'warning.main' : 'inherit',
          fontWeight: isMultipleValues ? 500 : 400,
        }}
      >
        {isMultipleValues && (
          <MenuItem value="" disabled>
            <Typography sx={{ color: 'warning.main', fontStyle: 'italic' }}>
              Multiple values
            </Typography>
          </MenuItem>
        )}
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
  param: ToolParameterSchema;
  value: boolean;
  onChange: (value: boolean) => void;
  onBlur?: (value: boolean) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={isMultipleValues ? false : value}
          onChange={(e) => {
            const newVal = e.target.checked;
            onChange(newVal);
            onBlur?.(newVal);
          }}
          color="primary"
          indeterminate={isMultipleValues}
        />
      }
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isMultipleValues ? 'warning.main' : 'inherit' }}>
          <Typography variant="body2">
            {isMultipleValues ? 'Multiple values' : param.label}
          </Typography>
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
  param: ToolParameterSchema;
  value: FloatRangeDefault;
  onChange: (value: FloatRangeDefault) => void;
  onBlur?: (value: FloatRangeDefault) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  const [localValue, setLocalValue] = useState<FloatRangeDefault>(
    isMultipleValues ? EMPTY_FLOAT_RANGE : value
  );

  // Sync local state when prop value changes
  useEffect(() => {
    setLocalValue(isMultipleValues ? EMPTY_FLOAT_RANGE : value);
  }, [value, isMultipleValues]);

  const handleChange = (field: 'min' | 'max' | 'step', newVal: number) => {
    const updated = { ...localValue, [field]: newVal };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleBlur = () => {
    onBlur?.(localValue);
  };

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
          value={localValue.min}
          onChange={(e) => handleChange('min', Number(e.target.value))}
          onBlur={handleBlur}
          size="small"
          inputProps={{ step: 0.01 }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Max"
          type="number"
          value={localValue.max}
          onChange={(e) => handleChange('max', Number(e.target.value))}
          onBlur={handleBlur}
          size="small"
          inputProps={{ step: 0.01 }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Step"
          type="number"
          value={localValue.step}
          onChange={(e) => handleChange('step', Number(e.target.value))}
          onBlur={handleBlur}
          size="small"
          inputProps={{ step: 0.01 }}
          sx={{ flex: 1 }}
        />
      </Box>
    </Box>
  );
};

const NumberListInput: React.FC<{
  param: ToolParameterSchema;
  value: number[];
  onChange: (value: number[]) => void;
  onBlur?: (value: number[]) => void;
  isMultipleValues?: boolean;
  step?: number;
  tooltipDescription: string;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false, step, tooltipDescription }) => {
  const displayValue = isMultipleValues ? [] : value;
  const [inputValue, setInputValue] = useState('');

  // Reset input field when prop changes
  useEffect(() => {
    setInputValue('');
  }, [value, isMultipleValues]);

  const handleAdd = () => {
    const num = Number(inputValue);
    if (inputValue && !isNaN(num) && !displayValue.includes(num)) {
      const updated = [...displayValue, num];
      onChange(updated);
      onBlur?.(updated);
      setInputValue('');
    }
  };

  const handleDelete = (numToDelete: number) => {
    const updated = displayValue.filter((num) => num !== numToDelete);
    onChange(updated);
    onBlur?.(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <Tooltip title={`Type: ${param.type} - ${tooltipDescription}`} arrow>
          <Info sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          placeholder={isMultipleValues ? 'Multiple values - Enter new value' : 'Enter value and press Enter'}
          fullWidth
          inputProps={step ? { step } : undefined}
        />
        <IconButton size="small" onClick={handleAdd} color="primary">
          <Add />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {displayValue.map((num) => (
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

// Integer list input (tag-style)
const IntListInput: React.FC<{
  param: ToolParameterSchema;
  value: number[];
  onChange: (value: number[]) => void;
  onBlur?: (value: number[]) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  return (
    <NumberListInput
      param={param}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isMultipleValues={isMultipleValues}
      tooltipDescription="Add multiple integer values"
    />
  );
};

// Float list input (tag-style)
const FloatListInput: React.FC<{
  param: ToolParameterSchema;
  value: number[];
  onChange: (value: number[]) => void;
  onBlur?: (value: number[]) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  return (
    <NumberListInput
      param={param}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isMultipleValues={isMultipleValues}
      step={0.01}
      tooltipDescription="Add multiple float values"
    />
  );
};

// Main parameter input renderer
const ParameterInput: React.FC<{
  param: ToolParameterSchema;
  value: any;
  onChange: (value: any) => void;
  onBlur?: (value: any) => void;
  isMultipleValues?: boolean;
}> = ({ param, value, onChange, onBlur, isMultipleValues = false }) => {
  switch (param.type) {
    case 'int':
      return (
        <IntegerInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    case 'float':
      return (
        <FloatInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    case 'enum':
      return (
        <EnumInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    case 'bool':
      return (
        <BoolInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    case 'float_range':
      return (
        <FloatRangeInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    case 'int_list':
      return (
        <IntListInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    case 'float_list':
      return (
        <FloatListInput
          param={param}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isMultipleValues={isMultipleValues}
        />
      );
    default:
      return null;
  }
};

const ParameterConfigComponent: React.FC<ParameterConfigProps> = ({
  toolSchema,
  values,
  onChange,
  selectedDatasetIds = [],
  focusDatasetId = null,
  focusDatasetName = null,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusPulse, setFocusPulse] = useState(false);
  const { resolveParameterValue } = useParameterDrafts();
  const { updateParameterDraft } = useApp();

  useEffect(() => {
    if (!focusDatasetId) return;

    setFocusPulse(true);
    const timer = window.setTimeout(() => setFocusPulse(false), 320);
    return () => window.clearTimeout(timer);
  }, [focusDatasetId]);

  const handleParamChange = (paramKey: string, value: any) => {
    const nextValues = { ...values, [paramKey]: value };
    const updatedValues = applyDependentDefaults(toolSchema, values, nextValues, paramKey);
    onChange(updatedValues);

    if (selectedDatasetIds.length > 0) {
      const changedKeys = Object.keys(updatedValues).filter(
        (key) => JSON.stringify(updatedValues[key]) !== JSON.stringify(values[key])
      );

      changedKeys.forEach((key) => {
        updateParameterDraft(selectedDatasetIds, key, updatedValues[key]);
      });
    }
  };

  // Separate parameters into basic and advanced
  const basicParams = Object.entries(toolSchema.parameters).filter(
    ([_, param]) => param.ui_group === 'basic'
  );
  const advancedParams = Object.entries(toolSchema.parameters).filter(
    ([_, param]) => param.ui_group === 'advanced'
  );
  const hasAdvanced = advancedParams.length > 0;
  const isMultiDatasetMode = selectedDatasetIds.length > 0;

  const renderParameterInputs = (params: Array<[string, ToolParameterSchema]>) =>
    params.map(([paramKey, param]) => {
      if (!shouldShowParameter(param.depends_on, values)) {
        return null;
      }

      let displayValue = values[paramKey];

      if (isMultiDatasetMode) {
        const resolvedDraftValue = resolveParameterValue(paramKey);
        // Keep schema defaults visible when drafts are not initialized yet.
        displayValue = resolvedDraftValue !== undefined ? resolvedDraftValue : values[paramKey];
      }

      return (
        <ParameterInput
          key={paramKey}
          param={param}
          value={displayValue}
          onChange={(value) => handleParamChange(paramKey, value)}
          isMultipleValues={false}
        />
      );
    });

  return (
    <Box
      sx={{
        animation: focusPulse ? 'focusPulseFade 320ms ease-in-out' : 'none',
        '@keyframes focusPulseFade': {
          '0%': {
            backgroundColor: 'rgba(25, 118, 210, 0.10)',
          },
          '100%': {
            backgroundColor: 'transparent',
          },
        },
      }}
    >
      {isMultiDatasetMode && focusDatasetId && (
        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
          Configuring {selectedDatasetIds.length} slice{selectedDatasetIds.length !== 1 ? 's' : ''} (Viewing:{' '}
          <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {focusDatasetName ?? focusDatasetId}
          </Box>
          )
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Configure Parameters
          {isMultiDatasetMode && (
            <Typography variant="caption" sx={{ ml: 1, color: 'info.main' }}>
              ({selectedDatasetIds.length} dataset{selectedDatasetIds.length !== 1 ? 's' : ''})
            </Typography>
          )}
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
        {isMultiDatasetMode
          ? `Adjust parameters for ${selectedDatasetIds.length} selected dataset${selectedDatasetIds.length !== 1 ? 's' : ''}. Changes will apply to all.`
          : 'Adjust the analysis parameters to optimize results for your data'}
      </Typography>

      {/* Side-by-side layout for basic and advanced parameters */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {/* Basic Parameters Section */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
            Basic Settings
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {renderParameterInputs(basicParams)}
          </Box>
        </Box>

        {/* Advanced Parameters Section */}
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
              {renderParameterInputs(advancedParams)}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ParameterConfigComponent;
