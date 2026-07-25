import React, { useCallback } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { CloudUpload, Lock } from '@mui/icons-material';

interface FileUploadCardProps {
  title: string;
  description: string;
  acceptedFormats: string[];
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiple?: boolean;
  uploadedFiles?: {
    id: string;
    name: string;
    uploadProgress: number;
    status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'ERROR';
    error?: string;
  }[];
  onFileSelect: (files: File[]) => void;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({
  title,
  description,
  acceptedFormats,
  required = false,
  disabled = false,
  readOnly = false,
  multiple = false,
  onFileSelect,
}) => {
  const interactive = !disabled && !readOnly;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!interactive) return;
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFileSelect(droppedFiles);
      }
    },
    [interactive, onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
      if (selectedFiles.length > 0) {
        onFileSelect(selectedFiles);
      }
      e.target.value = '';
    },
    [onFileSelect]
  );

  return (
    <Paper
      component={interactive ? 'label' : 'div'}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      sx={{
        width: '100%',
        display: 'block',
        boxSizing: 'border-box',
        alignSelf: 'stretch',
        p: 3,
        border: '2px dashed',
        borderColor: disabled ? 'divider' : 'divider',
        backgroundColor: disabled ? 'action.disabledBackground' : 'white',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': interactive
          ? {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(13, 148, 136, 0.05)',
            }
          : {},
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {interactive && (
        <input
          type="file"
          accept={acceptedFormats.join(',')}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          style={{ display: 'none' }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%', minWidth: 0 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: disabled
              ? 'action.disabledBackground'
              : 'rgba(13, 148, 136, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {disabled ? (
            <Lock sx={{ fontSize: 24, color: 'text.disabled' }} />
          ) : (
            <CloudUpload sx={{ fontSize: 24, color: 'primary.main' }} />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              {title}
            </Typography>
            {required && (
              <Chip
                label="Required"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: 'error.main',
                  color: 'white',
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {acceptedFormats.join(', ')}
            {multiple ? ' — you can select multiple files' : ''}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default FileUploadCard;