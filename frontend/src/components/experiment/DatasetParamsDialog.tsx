import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Typography,
} from '@mui/material';

interface DatasetParamsDialogProps {
  open: boolean;
  onClose: () => void;
  datasetName: string;
  params: Record<string, unknown>;
}

const DatasetParamsDialog: React.FC<DatasetParamsDialogProps> = ({
  open,
  onClose,
  datasetName,
  params,
}) => {
  if (!params || Object.keys(params).length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
          Parameters for {datasetName}
      </DialogTitle>
      <DialogContent dividers>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.entries(params).map(([key, value]) => (
            <Chip
              key={key}
              label={`${key}: ${String(value)}`}
              variant="outlined"
              size="small"
            />
          ))}
        </div>
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