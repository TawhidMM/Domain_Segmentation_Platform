import React, { useState, useCallback } from 'react';
import { Box, Typography, TextField, Button, IconButton } from '@mui/material';
import { DeleteOutline, ErrorOutline } from '@mui/icons-material';
import { DatasetUploadQueueItem } from '@/types';

interface DatasetUploadRowProps {
  item: DatasetUploadQueueItem;
  onUpdateName: (datasetId: string, name: string) => void;
  onRetry: (queueItemId: string) => void;
  onDelete: (datasetId: string) => void;
}

const DatasetUploadRow: React.FC<DatasetUploadRowProps> = ({
  item,
  onUpdateName,
  onRetry,
  onDelete,
}) => {
  const [localName, setLocalName] = useState<string>(item.datasetName);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleBlur = useCallback(() => {
    if (item.datasetId && localName !== item.datasetName && localName.trim()) {
      onUpdateName(item.datasetId, localName);
    }
    setIsEditing(false);
  }, [localName, item.datasetName, item.datasetId, onUpdateName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setLocalName(item.datasetName);
        setIsEditing(false);
      }
    },
    [handleBlur, item.datasetName]
  );

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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
        {item.datasetId && item.status === 'SUCCESS' ? (
          <TextField
            size="small"
            label="Dataset name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            helperText={isEditing ? 'Press Enter to save, Esc to cancel' : ''}
            sx={{ maxWidth: 360 }}
            disabled={item.status !== 'SUCCESS'}
          />
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {localName}
          </Typography>
        )}
        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          {item.datasetId ?? 'Pending dataset id'}
        </Typography>
        {item.error && (
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            {item.error}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {item.status === 'UPLOADING' && (
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 100 }}>
            Uploading {item.uploadProgress}%
          </Typography>
        )}
        {item.status === 'ERROR' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }}>
              <ErrorOutline sx={{ fontSize: 16 }} />
              <Typography variant="caption">Failed</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => onRetry(item.id)}
            >
              Retry
            </Button>
          </>
        )}
        {item.status === 'SUCCESS' && item.datasetId && (
          <IconButton
            size="small"
            aria-label={`Remove ${item.datasetId}`}
            onClick={() => onDelete(item.datasetId!)}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
        {item.status === 'ERROR' && (
          <IconButton
            size="small"
            aria-label="Remove failed item"
            onClick={() => onDelete(item.id)}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default DatasetUploadRow;
