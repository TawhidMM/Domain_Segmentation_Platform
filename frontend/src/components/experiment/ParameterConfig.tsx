import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { Tune } from '@mui/icons-material';
import { ToolSchema, ToolParameterSchema, DependsOnCondition } from '@/types';
import { applyDependentDefaults } from '@/utils/parameterUtils';
import { checkDependsOn } from '@/utils/dependsOn';
import { useParameterDrafts } from '@/hooks/useParameterDrafts';
import { useApp } from '@/context/AppContext';
import { ParameterInput } from './ParameterFields';

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

  const renderParameterInputs = (
    params: Array<[string, ToolParameterSchema]>
  ) =>
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