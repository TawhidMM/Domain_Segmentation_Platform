import { ToolSchema, ToolParameterSchema, FloatRangeDefault } from '@/types';

/**
 * Initialize parameter values from tool schema defaults
 */
export const initializeParameterValues = (toolSchema: ToolSchema): Record<string, any> => {
  const values: Record<string, any> = {};

  Object.entries(toolSchema.params).forEach(([paramKey, param]) => {
    values[paramKey] = param.default;
  });

  return values;
};

/**
 * Expand float_range parameter to array of values
 */
export const expandFloatRange = (range: FloatRangeDefault): number[] => {
  const { min, max, step } = range;
  const values: number[] = [];
  
  for (let val = min; val <= max; val += step) {
    // Round to avoid floating point precision issues
    values.push(Math.round(val * 1000) / 1000);
  }
  
  return values;
};

/**
 * Convert parameter values for API submission
 * Expands float_range to arrays
 */
export const prepareParametersForSubmission = (
  toolSchema: ToolSchema,
  values: Record<string, any>
): Record<string, any> => {
  const prepared: Record<string, any> = {};

  Object.entries(values).forEach(([paramKey, value]) => {
    const param = toolSchema.params[paramKey];
    
    if (param.type === 'float_range') {
      // Expand float_range to array
      prepared[paramKey] = expandFloatRange(value as FloatRangeDefault);
    } else {
      prepared[paramKey] = value;
    }
  });

  return prepared;
};

/**
 * Validate parameter values
 */
export const validateParameterValues = (
  toolSchema: ToolSchema,
  values: Record<string, any>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  Object.entries(toolSchema.params).forEach(([paramKey, param]) => {
    const value = values[paramKey];

    // Check if required parameter is present
    if (value === undefined || value === null) {
      errors.push(`Parameter "${param.label}" is required`);
      return;
    }

    // Validate int and float
    if (param.type === 'int' || param.type === 'float') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`Parameter "${param.label}" must be a valid number`);
        return;
      }
      if (param.min !== undefined && value < param.min) {
        errors.push(`Parameter "${param.label}" must be at least ${param.min}`);
      }
      if (param.max !== undefined && value > param.max) {
        errors.push(`Parameter "${param.label}" must be at most ${param.max}`);
      }
    }

    // Validate enum
    if (param.type === 'enum') {
      if (!param.options?.includes(value)) {
        errors.push(`Parameter "${param.label}" must be one of: ${param.options?.join(', ')}`);
      }
    }

    // Validate bool
    if (param.type === 'bool') {
      if (typeof value !== 'boolean') {
        errors.push(`Parameter "${param.label}" must be a boolean`);
      }
    }

    // Validate int_list
    if (param.type === 'int_list') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push(`Parameter "${param.label}" must contain at least one value`);
      } else if (!value.every(v => Number.isInteger(v))) {
        errors.push(`Parameter "${param.label}" must contain only integers`);
      }
    }

    // Validate float_list
    if (param.type === 'float_list') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push(`Parameter "${param.label}" must contain at least one value`);
      } else if (!value.every(v => typeof v === 'number' && !isNaN(v))) {
        errors.push(`Parameter "${param.label}" must contain only numbers`);
      }
    }

    // Validate float_range
    if (param.type === 'float_range') {
      if (!value.min || !value.max || !value.step) {
        errors.push(`Parameter "${param.label}" must have min, max, and step values`);
      } else if (value.min >= value.max) {
        errors.push(`Parameter "${param.label}": min must be less than max`);
      } else if (value.step <= 0) {
        errors.push(`Parameter "${param.label}": step must be greater than 0`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
