import React, { useCallback } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { CloudUpload, Check, Lock } from '@mui/icons-material';

interface FileUploadCardProps {
  title: string;
  description: string;
  acceptedFormats: string[];
  required?: boolean;
  disabled?: boolean;
  uploadedFile: File | null;
  onFileSelect: (file: File) => void;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({
  title,
  description,
  acceptedFormats,
  required = false,
  disabled = false,
  uploadedFile,
  onFileSelect,
}) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const isUploaded = !!uploadedFile;

  return (
    <Paper
      component="label"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      sx={{
        p: 3,
        border: '2px dashed',
        borderColor: disabled ? 'divider' : isUploaded ? 'primary.main' : 'divider',
        backgroundColor: disabled ? 'action.disabledBackground' : isUploaded ? 'rgba(13, 148, 136, 0.05)' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        '&:hover': disabled
          ? {}
          : {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(13, 148, 136, 0.05)',
            },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInput}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: disabled
              ? 'action.disabledBackground'
              : isUploaded
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
          ) : isUploaded ? (
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

          {isUploaded ? (
            <Chip
              label={uploadedFile.name}
              size="small"
              onDelete={() => {}} // Placeholder for delete functionality
              sx={{
                maxWidth: '100%',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            />
          ) : (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {acceptedFormats.join(', ')}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default FileUploadCard;
