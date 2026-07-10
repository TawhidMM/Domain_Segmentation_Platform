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
  IconButton,
} from '@mui/material';
import { Info, Add, Close } from '@mui/icons-material';
import { ToolParameterSchema, FloatRangeDefault } from '@/types';
import { useSyncedNumberInput, useSyncedFloatRange } from './useSyncedInput';

// ============================================================================
// Parameter Input Props (Shared)
// ============================================================================

interface ParameterInputProps {
  param: ToolParameterSchema;
  value: any;
  onChange: (value: any) => void;
  onBlur?: (value: any) => void;
  isMultipleValues?: boolean;
}

// ============================================================================
// Integer Input
// ============================================================================

export const IntegerInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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

// ============================================================================
// Float Input
// ============================================================================

export const FloatInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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

// ============================================================================
// Enum Input
// ============================================================================

export const EnumInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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
            <Typography sx={{ color: 'warning.main', fontStyle: 'italic', opacity: 1 }}>
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

// ============================================================================
// Boolean Input
// ============================================================================

export const BoolInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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

// ============================================================================
// Float Range Input
// ============================================================================

export const FloatRangeInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
  const [localValue, setLocalValue] = useSyncedFloatRange(value, isMultipleValues);

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

// ============================================================================
// Number List Input (Generic)
// ============================================================================

interface NumberListInputProps {
  param: ToolParameterSchema;
  value: number[];
  onChange: (value: number[]) => void;
  onBlur?: (value: number[]) => void;
  isMultipleValues?: boolean;
  step?: number;
  tooltipDescription: string;
}

const NumberListInput: React.FC<NumberListInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
  step,
  tooltipDescription,
}) => {
  const displayValue = isMultipleValues ? [] : value;
  const [inputValue, setInputValue] = useState('');

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

// ============================================================================
// Integer List Input
// ============================================================================

export const IntListInput: React.FC<Omit<NumberListInputProps, 'step' | 'tooltipDescription'>> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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

// ============================================================================
// Float List Input
// ============================================================================

export const FloatListInput: React.FC<Omit<NumberListInputProps, 'step' | 'tooltipDescription'>> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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

// ============================================================================
// Parameter Input (Main Dispatcher)
// ============================================================================

import { Tooltip } from '@mui/material';

/**
 * Main parameter input component that dispatches to the appropriate
 * input type based on the parameter schema type.
 */
export const ParameterInput: React.FC<ParameterInputProps> = ({
  param,
  value,
  onChange,
  onBlur,
  isMultipleValues = false,
}) => {
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

export default ParameterInput;