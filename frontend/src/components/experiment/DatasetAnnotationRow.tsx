import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { Edit } from '@mui/icons-material';

interface DatasetAnnotationRowProps {
  datasetId: string;
  datasetName: string;
  annotationId?: string;
  onAnnotate: (datasetId: string, annotationId?: string) => void;
}

const DatasetAnnotationRow: React.FC<DatasetAnnotationRowProps> = ({
  datasetId,
  datasetName,
  annotationId,
  onAnnotate,
}) => {
  const isAnnotated = Boolean(annotationId);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        backgroundColor: 'white',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {datasetName}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          {datasetId}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Chip
          size="small"
          label={isAnnotated ? 'Annotated' : 'Pending annotation'}
          color={isAnnotated ? 'success' : 'warning'}
          variant={isAnnotated ? 'filled' : 'outlined'}
        />
        <Button
          size="small"
          variant={isAnnotated ? 'outlined' : 'contained'}
          startIcon={<Edit fontSize="small" />}
          onClick={() => onAnnotate(datasetId, annotationId)}
        >
          {isAnnotated ? 'Edit' : 'Annotate'}
        </Button>
      </Box>
    </Box>
  );
};

export default DatasetAnnotationRow;
