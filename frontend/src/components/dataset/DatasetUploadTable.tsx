import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { DatasetUploadQueueItem } from '@/types';
import DatasetUploadRow from './DatasetUploadRow';

interface DatasetUploadTableProps {
  items: DatasetUploadQueueItem[];
  onUpdateName: (datasetId: string, name: string) => void;
  onRetry: (queueItemId: string) => void;
  onDelete: (datasetId: string) => void;
}

const DatasetUploadTable: React.FC<DatasetUploadTableProps> = ({
  items,
  onUpdateName,
  onRetry,
  onDelete,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        mt: 4,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 400,
        overflow: 'hidden',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, flexShrink: 0 }}>
        Uploaded Dataset
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto',
          flex: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      >
        {items.map((item) => (
          <DatasetUploadRow
            key={item.id}
            item={item}
            onUpdateName={onUpdateName}
            onRetry={onRetry}
            onDelete={onDelete}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default DatasetUploadTable;
