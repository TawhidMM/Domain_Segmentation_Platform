import React, { useCallback } from 'react';
import { Box, Typography, Paper, Chip, LinearProgress } from '@mui/material';
import { CloudUpload, Check, Lock, Error as ErrorIcon } from '@mui/icons-material';

interface FileUploadCardProps {
  title: string;
  description: string;
  acceptedFormats: string[];
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiple?: boolean;
  uploadedFiles: {
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
  uploadedFiles,
  onFileSelect,
}) => {
  const interactive = !disabled && !readOnly;
  const hasUploads = uploadedFiles.length > 0;
  const hasError = uploadedFiles.some((file) => file.status === 'ERROR');
  const totalFiles = uploadedFiles.length;
  const successfulFiles = uploadedFiles.filter((file) => file.status === 'SUCCESS').length;
  const failedFiles = uploadedFiles.filter((file) => file.status === 'ERROR').length;
  const activeUpload = uploadedFiles.find((file) => file.status === 'UPLOADING');
  const aggregateProgress =
    totalFiles > 0
      ? Math.round(
          uploadedFiles.reduce((sum, file) => {
            if (file.status === 'SUCCESS') return sum + 100;
            if (file.status === 'UPLOADING') return sum + file.uploadProgress;
            return sum;
          }, 0) / totalFiles
        )
      : 0;

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
        p: 3,
        border: '2px dashed',
        borderColor: disabled ? 'divider' : hasUploads ? 'primary.main' : 'divider',
        backgroundColor: disabled ? 'action.disabledBackground' : hasUploads ? 'rgba(13, 148, 136, 0.05)' : 'white',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': interactive
          ? {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(13, 148, 136, 0.05)',
            }
          : {
              borderColor: disabled ? 'divider' : hasUploads ? 'primary.main' : 'divider',
              backgroundColor: disabled ? 'action.disabledBackground' : hasUploads ? 'rgba(13, 148, 136, 0.05)' : 'white',
            },
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

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: disabled
              ? 'action.disabledBackground'
              : hasError
              ? 'error.main'
              : hasUploads
              ? 'primary.main'
              : 'rgba(13, 148, 136, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {disabled ? (
            <Lock sx={{ fontSize: 24, color: 'text.disabled' }} />
          ) : hasError ? (
            <ErrorIcon sx={{ fontSize: 24, color: 'white' }} />
          ) : hasUploads ? (
            <Check sx={{ fontSize: 24, color: 'white' }} />
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
            {disabled && (
              <Chip
                label="Coming Soon"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: 'text.secondary',
                  color: 'white',
                }}
              />
            )}
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {description}
          </Typography>

          {hasUploads ? (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                {successfulFiles}/{totalFiles} uploaded
                {failedFiles > 0 ? ` • ${failedFiles} failed` : ''}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={aggregateProgress}
                sx={{ height: 6, borderRadius: 999, mb: 0.75 }}
              />
              {activeUpload && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Uploading {activeUpload.name} ({activeUpload.uploadProgress}%)
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {acceptedFormats.join(', ')}
              {multiple ? ' - multiple files supported' : ''}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default FileUploadCard;
