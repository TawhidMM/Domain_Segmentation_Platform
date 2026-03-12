import React, { useMemo } from 'react';
import { Box, Chip, Typography, Stack, Tooltip } from '@mui/material';
import { alpha, Theme } from '@mui/material/styles';
import { Check, Eye } from 'lucide-react';

interface DatasetSelectionBarProps {
  availableDatasets: Array<{ id: string; name: string }>;
  selectedDatasetIds: string[];
  focusDatasetId: string | null;
  onSelectionChange: (datasetIds: string[], focusDatasetId: string | null) => void;
  disabled?: boolean;
}

/**
 * DatasetSelectionBar: Horizontal wrapping layout for dataset selection
 * Features:
 * - "Select/Deselect All" button as first item
 * - Horizontal pill layout with automatic wrapping
 * - Visual indicators for selected state
 * - Disabled state support
 */
const DatasetSelectionBar: React.FC<DatasetSelectionBarProps> = React.memo(
  ({
    availableDatasets,
    selectedDatasetIds,
    focusDatasetId,
    onSelectionChange,
    disabled = false,
  }) => {
    // Determine if all datasets are selected
    const allSelected = useMemo(
      () =>
        availableDatasets.length > 0 &&
        selectedDatasetIds.length === availableDatasets.length,
      [availableDatasets.length, selectedDatasetIds.length]
    );

    const handleSelectAll = () => {
      if (allSelected) {
        onSelectionChange([], null);
      } else {
        const ids = availableDatasets.map((d) => d.id);
        onSelectionChange(ids, ids[0] ?? null);
      }
    };

    const handleToggleDataset = (datasetId: string) => {
      const isSelected = selectedDatasetIds.includes(datasetId);
      const isFocused = focusDatasetId === datasetId;

      if (!isSelected) {
        // Add to batch and focus it immediately.
        onSelectionChange([...selectedDatasetIds, datasetId], datasetId);
      } else if (isSelected && !isFocused) {
        // Switch focus only to avoid accidental deselection.
        onSelectionChange(selectedDatasetIds, datasetId);
      } else {
        // Deselect only when clicked dataset is already focused.
        const nextSelection = selectedDatasetIds.filter((id) => id !== datasetId);
        onSelectionChange(nextSelection, nextSelection.length > 0 ? nextSelection[0] : null);
      }
    };

    if (availableDatasets.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
          No datasets available
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
          Select Datasets
        </Typography>

        {/** Variable-width chips with consistent height/padding keep layout tidy and readable. */}
        {/** Long dataset names are truncated with tooltip to prevent row breakage. */}

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Chip
            label="ALL"
            onClick={handleSelectAll}
            disabled={disabled}
            variant={allSelected ? 'filled' : 'outlined'}
            color={allSelected ? 'primary' : 'default'}
            sx={{
              height: 32,
              '& .MuiChip-label': {
                px: 1.5,
                fontWeight: 600,
              },
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': !disabled
                ? {
                    backgroundColor: allSelected ? 'primary.light' : 'action.hover',
                  }
                : {},
            }}
          />

          {/* Dataset Selection Pills */}
          {availableDatasets.map((dataset) => {
            const isSelected = selectedDatasetIds.includes(dataset.id);
            const isFocused = focusDatasetId === dataset.id;

            const tierStyles = {
              unselected: {
                variant: 'outlined' as const,
                color: 'default' as const,
                icon: undefined,
                sx: {
                  opacity: disabled ? 0.4 : 0.55,
                  borderColor: 'divider',
                  backgroundColor: 'transparent',
                },
              },
              selected: {
                variant: 'filled' as const,
                color: 'primary' as const,
                icon: <Check size={15} />,
                sx: {
                  opacity: disabled ? 0.5 : 1,
                  backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.16),
                  color: 'primary.dark',
                  border: '2px solid',
                  borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.56),
                },
              },
              focused: {
                variant: 'filled' as const,
                color: 'primary' as const,
                icon: <Eye size={15} />,
                sx: {
                  opacity: disabled ? 0.6 : 1,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  border: '2px solid',
                  borderColor: 'primary.dark',
                  boxShadow: (theme: Theme) => `0 0 0 1px ${alpha(theme.palette.primary.dark, 0.24)}`,
                },
              },
            };

            const styleTier = isFocused
              ? tierStyles.focused
              : isSelected
              ? tierStyles.selected
              : tierStyles.unselected;

            return (
              <Tooltip key={dataset.id} title={dataset.name} arrow>
                <Chip
                  label={dataset.name}
                  onClick={() => handleToggleDataset(dataset.id)}
                  variant={styleTier.variant}
                  color={styleTier.color}
                  disabled={disabled}
                  icon={styleTier.icon}
                  sx={{
                    height: 32,
                    maxWidth: 200,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    ...styleTier.sx,
                    transition: 'all 0.2s ease-in-out',
                    '& .MuiChip-label': {
                      px: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                    '&:hover': !disabled
                      ? {
                          transform: 'translateY(-1px)',
                          backgroundColor: isFocused
                            ? 'primary.dark'
                            : isSelected
                            ? (theme: Theme) => alpha(theme.palette.primary.main, 0.24)
                            : 'action.hover',
                        }
                      : {},
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>

        {/* Info text */}
        {selectedDatasetIds.length === 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Select at least one dataset to configure parameters
          </Typography>
        )}

        {selectedDatasetIds.length > 1 && (
          <Typography variant="caption" sx={{ color: 'info.main' }}>
            {selectedDatasetIds.length} datasets selected. Parameters will be applied to all
            selected datasets.
          </Typography>
        )}

        {focusDatasetId && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Viewing: {availableDatasets.find((d) => d.id === focusDatasetId)?.name ?? focusDatasetId}
          </Typography>
        )}
      </Stack>
    );
  }
);

DatasetSelectionBar.displayName = 'DatasetSelectionBar';

export default DatasetSelectionBar;
