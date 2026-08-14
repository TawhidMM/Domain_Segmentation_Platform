import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export interface ViewModeOption<V extends string> {
  value: V;
  label: string;
}

interface ViewModeToggleProps<V extends string> {
  value: V;
  options: ViewModeOption<V>[];
  onChange: (value: V) => void;
  ariaLabel?: string;
}

/**
 * Shared single-select segmented control (ToggleButtonGroup) with a consistent
 * style matching the app's global tabbar scale (0.8125rem).
 */
const ViewModeToggle = <V extends string>(props: ViewModeToggleProps<V>): React.ReactElement => {
  const { value, options, onChange, ariaLabel = 'view mode' } = props;

  const handleChange = (_event: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    if (newValue !== null) {
      onChange(newValue as V);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      aria-label={ariaLabel}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          textTransform: 'none',
          fontSize: '0.8125rem',
          fontWeight: 500,
          minHeight: 36,
          px: 1.5,
          py: 0.5,
          border: '1px solid',
          borderColor: 'grey.300',
          color: 'grey.700',
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'white',
            borderColor: 'primary.main',
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default ViewModeToggle;