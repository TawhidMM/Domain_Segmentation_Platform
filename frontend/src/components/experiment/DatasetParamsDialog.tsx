import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { ToolSchema } from '@/types';

interface DatasetParamsDialogProps {
  open: boolean;
  onClose: () => void;
  datasetName: string;
  params: Record<string, unknown>;
  toolSchema?: ToolSchema | null;
}

const formatValue = (value: unknown, paramType?: string): React.ReactNode => {
  if (value === null || value === undefined) return 'null';

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    if (paramType === 'float_range') {
      const min = (obj.min as number | string | undefined) ?? '?';
      const max = (obj.max as number | string | undefined) ?? '?';
      const step = (obj.step as number | string | undefined) ?? '?';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {String(min)} → {String(max)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            step: {String(step)}
          </Typography>
        </Box>
      );
    }

    const entries = Object.entries(obj);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
        {entries.map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 60 }}>{k}:</Typography>
            <Typography variant="body2">{formatValue(v) as React.ReactNode}</Typography>
          </Box>
        ))}
      </Box>
    );
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
};

const DatasetParamsDialog: React.FC<DatasetParamsDialogProps> = ({
  open,
  onClose,
  datasetName,
  params,
  toolSchema,
}) => {
  if (!params || Object.keys(params).length === 0) {
    return null;
  }

  const basicEntries: Array<[string, unknown]> = [];
  const advancedEntries: Array<[string, unknown]> = [];

  Object.entries(params).forEach(([key, value]) => {
    if (key === 'profile') return;
    const paramMeta = toolSchema?.parameters?.[key];
    if (paramMeta?.ui_group === 'advanced') {
      advancedEntries.push([key, value]);
    } else {
      basicEntries.push([key, value]);
    }
  });

  const hasAdvanced = advancedEntries.length > 0;

  const renderEntries = (entries: Array<[string, unknown]>) =>
    entries.map(([key, value]) => {
      const paramMeta = toolSchema?.parameters?.[key];
      const label = paramMeta?.label ?? key;

      return (
        <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {label}
          </Typography>
          <Box sx={{ wordBreak: 'break-word' }}>
            {formatValue(value, paramMeta?.type)}
          </Box>
        </Box>
      );
    });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
          Parameters for {datasetName}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: hasAdvanced ? '1fr 1fr' : '1fr',
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'primary.main' }}>
              Basic Settings
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {renderEntries(basicEntries)}
            </Box>
          </Box>

          {hasAdvanced && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'warning.main' }}>
                Advanced Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {renderEntries(advancedEntries)}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatasetParamsDialog;