import React, { useState, useCallback, useRef } from 'react';
import { Box, Typography, TextField, Button, IconButton, LinearProgress, Chip } from '@mui/material';
import { DeleteOutline, ErrorOutline, HourglassEmpty } from '@mui/icons-material';
import type { DatasetItem } from '@/types';

interface DatasetUploadRowProps {
  item: DatasetItem;
  onUpdateName: (datasetId: string, name: string) => void;
  onRetry: (queueItemId: string) => void;
  onDelete: (idOrDatasetId: string) => void;
}

const DatasetUploadRow: React.FC<DatasetUploadRowProps> = ({
  item,
  onUpdateName,
  onRetry,
  onDelete,
}) => {
  const [localName, setLocalName] = useState<string>(item.datasetName);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const isEscaping = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showSavedIndicator = useCallback(() => {
    setIsSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setIsSaved(false), 1500);
  }, []);

  const handleRename = useCallback(() => {
    if (isEscaping.current) {
      isEscaping.current = false;
      return;
    }
    if (item.datasetId && localName !== item.datasetName && localName.trim()) {
      onUpdateName(item.datasetId, localName);
      showSavedIndicator();
    }
    setIsEditing(false);
  }, [localName, item.datasetName, item.datasetId, onUpdateName, showSavedIndicator]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        setIsEditing(false);
        showSavedIndicator();
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setLocalName(item.datasetName);
        isEscaping.current = true;
        setIsEditing(false);
        inputRef.current?.blur();
      }
    },
    [item.datasetName, showSavedIndicator]
  );

  const helperText = isEditing
    ? 'Press Enter to save, Esc to cancel'
    : isSaved
      ? '✓ Saved'
      : '';

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
        {/* Name field or display */}
        {item.status === 'SUCCESS' && item.datasetId ? (
          <TextField
            inputRef={inputRef}
            size="small"
            label="Dataset name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            helperText={helperText}
            sx={{
              maxWidth: 360,
              '& .MuiFormHelperText-root': {
                color: isSaved ? 'success.main' : undefined,
              },
            }}
          />
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {item.fileName}
          </Typography>
        )}

        {/* Progress bar for uploading */}
        {item.status === 'UPLOADING' && (
          <Box sx={{ maxWidth: 360 }}>
            <LinearProgress
              variant="determinate"
              value={item.uploadProgress}
              sx={{ height: 6, borderRadius: 999, mb: 0.5 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Uploading {item.uploadProgress}%
            </Typography>
          </Box>
        )}

        {/* Progress bar for sample download */}
        {item.status === 'DOWNLOADING' && (
          <Box sx={{ maxWidth: 360 }}>
            <LinearProgress
              variant="determinate"
              value={item.uploadProgress}
              sx={{ height: 6, borderRadius: 999, mb: 0.5 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Downloading {item.uploadProgress}%
            </Typography>
          </Box>
        )}

        {/* Processing spinner */}
        {item.status === 'PROCESSING' && (
          <Box sx={{ maxWidth: 360, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: '100%' }}>
              <LinearProgress sx={{ height: 6, borderRadius: 999 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                Processing dataset...
              </Typography>
            </Box>
          </Box>
        )}

        {/* Dataset ID */}
        {item.datasetId && (
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
            {item.datasetId}
          </Typography>
        )}

        {/* Error message */}
        {item.error && (
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            {item.error}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {/* PENDING badge */}
        {item.status === 'PENDING' && (
          <Chip
            icon={<HourglassEmpty sx={{ fontSize: 14 }} />}
            label="Queued"
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        )}

        {/* UPLOADING badge */}
        {(item.status === 'UPLOADING' || item.status === 'DOWNLOADING') && (
          <Chip
            label={`${item.uploadProgress}%`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        )}

        {/* DOWNLOADING badge */}
        {/*{item.status === 'DOWNLOADING' && (*/}
        {/*  <Chip*/}
        {/*    icon={<Download sx={{ fontSize: 14 }} />}*/}
        {/*    label={`${item.uploadProgress}%`}*/}
        {/*    size="small"*/}
        {/*    color="secondary"*/}
        {/*    variant="outlined"*/}
        {/*    sx={{ fontSize: '0.75rem' }}*/}
        {/*  />*/}
        {/*)}*/}

        {/* ERROR actions */}
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

        {/* Delete button for SUCCESS and ERROR */}
        {(item.status === 'SUCCESS' || item.status === 'ERROR') && (
          <IconButton
            size="small"
            aria-label={`Remove ${item.fileName}`}
            onClick={() => onDelete(item.datasetId || item.id)}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default DatasetUploadRow;