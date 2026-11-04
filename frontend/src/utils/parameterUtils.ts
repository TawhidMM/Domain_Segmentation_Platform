import { ToolSchema, ToolParameterSchema, FloatRangeDefault } from '@/types';

/**
 * Resolve effective parameters for a specific dataset.
 * Per-dataset overrides take precedence; falls back to global parameters.
 * This is the single source of truth for parameter resolution.
 */
export const resolveDatasetParameters = (
  datasetId: string,
  overrides: Record<string, Record<string, unknown>> | undefined,
  globalParameters: Record<string, unknown>,
): Record<string, unknown> => {
  const datasetOverrides = overrides?.[datasetId];
  if (!datasetOverrides) return globalParameters;
  return { ...globalParameters, ...datasetOverrides };
};

/**
 * Check if a dataset has any parameters to display.
 * Useful for gating UI elements like the "View Params" button.
 */
export const hasDatasetParameters = (
  datasetId: string,
  overrides: Record<string, Record<string, unknown>> | undefined,
  globalParameters: Record<string, unknown>,
): boolean => {
  const resolved = resolveDatasetParameters(datasetId, overrides, globalParameters);
  return Object.keys(resolved).length > 0;
};

/**
 * Initialize parameter values from tool schema defaults
 */
export const resolveDefaultValue = (
  paramKey: string,
  param: ToolParameterSchema,
  currentValues: Record<string, any>,
  toolSchema?: ToolSchema,
): any => {
  // Check for profile-based overrides
  if (toolSchema?.profiles && currentValues.profile) {
    const profileConfig = toolSchema.profiles[currentValues.profile];
    if (profileConfig?.overrides?.[paramKey] !== undefined) {
      return profileConfig.overrides[paramKey];
    }
  }

  // Static default
  if (param.default !== undefined) {
    return param.default;
  }

  // No default
  return undefined;
};

const isShallowEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return false;
};

/**
 * Apply profile-based overrides when profile parameter changes
 */
export const applyDependentDefaults = (
  toolSchema: ToolSchema,
  prevValues: Record<string, any>,
  nextValues: Record<string, any>,
  changedKey?: string,
): Record<string, any> => {
  const updated = { ...nextValues };

  // If profile changed, apply profile overrides
  if (changedKey === 'profile' && toolSchema.profiles && updated.profile) {
    const profileConfig = toolSchema.profiles[updated.profile];
    if (profileConfig?.overrides) {
      Object.entries(profileConfig.overrides).forEach(([paramKey, overrideValue]) => {
        updated[paramKey] = overrideValue;
      });
    }
  }

  return updated;
};

export const initializeParameterValues = (toolSchema: ToolSchema): Record<string, any> => {
  const values: Record<string, any> = {};

  Object.entries(toolSchema.parameters).forEach(([paramKey, param]) => {
    values[paramKey] = resolveDefaultValue(paramKey, param, values, toolSchema);
  });

  // Apply profile overrides if profile is set
  if (values.profile && toolSchema.profiles) {
    const profileConfig = toolSchema.profiles[values.profile];
    if (profileConfig?.overrides) {
      Object.entries(profileConfig.overrides).forEach(([paramKey, overrideValue]) => {
        values[paramKey] = overrideValue;
      });
    }
  }

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
    // Pass parameters as-is (float_range stays as {min, max, step})
    prepared[paramKey] = value;
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

  Object.entries(toolSchema.parameters).forEach(([paramKey, param]) => {
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
      // int must be whole numbers
      if (param.type === 'int' && !Number.isInteger(value)) {
        errors.push(`Parameter "${param.label}" must be a whole number`);
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
      } else {
        if (param.min !== undefined && value.some((v: number) => v < param.min)) {
          errors.push(`Parameter "${param.label}" must be at least ${param.min}`);
        }
        if (param.max !== undefined && value.some((v: number) => v > param.max)) {
          errors.push(`Parameter "${param.label}" must be at most ${param.max}`);
        }
      }
    }

    // Validate float_list
    if (param.type === 'float_list') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push(`Parameter "${param.label}" must contain at least one value`);
      } else if (!value.every(v => typeof v === 'number' && !isNaN(v))) {
        errors.push(`Parameter "${param.label}" must contain only numbers`);
      } else {
        if (param.min !== undefined && value.some((v: number) => v < param.min)) {
          errors.push(`Parameter "${param.label}" must be at least ${param.min}`);
        }
        if (param.max !== undefined && value.some((v: number) => v > param.max)) {
          errors.push(`Parameter "${param.label}" must be at most ${param.max}`);
        }
      }
    }

    // Validate float_range
    if (param.type === 'float_range') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`Parameter "${param.label}" must be a range with min, max, and step`);
      } else if (value.min == null || value.max == null || value.step == null) {
        errors.push(`Parameter "${param.label}" must have min, max, and step values`);
      } else if (
        typeof value.min !== 'number' ||
        typeof value.max !== 'number' ||
        typeof value.step !== 'number' ||
        !isFinite(value.min) ||
        !isFinite(value.max) ||
        !isFinite(value.step)
      ) {
        errors.push(`Parameter "${param.label}" min, max, and step must be finite numbers`);
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