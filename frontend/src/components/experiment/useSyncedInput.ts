import { useState, useEffect } from 'react';

/**
 * Hook for syncing input values between string display and numeric storage.
 * Handles text input synchronization and numeric conversion.
 */
export const useSyncedNumberInput = (
  value: number,
  isMultipleValues: boolean
) => {
  const [localValue, setLocalValue] = useState<string>(
    isMultipleValues ? '' : String(value ?? '')
  );

  useEffect(() => {
    setLocalValue(isMultipleValues ? '' : String(value ?? ''));
  }, [value, isMultipleValues]);

  return [localValue, setLocalValue] as const;
};

/**
 * Hook for syncing float range values (min/max/step) with a local editable state.
 */
export type FloatRangeDefaultValue = {
  min: number;
  max: number;
  step: number;
};

export const useSyncedFloatRange = (
  value: FloatRangeDefaultValue,
  isMultipleValues: boolean
) => {
  const [localValue, setLocalValue] = useState<FloatRangeDefaultValue>(
    isMultipleValues ? { min: 0, max: 0, step: 0 } : value
  );

  useEffect(() => {
    setLocalValue(isMultipleValues ? { min: 0, max: 0, step: 0 } : value);
  }, [value, isMultipleValues]);

  return [localValue, setLocalValue] as const;
};