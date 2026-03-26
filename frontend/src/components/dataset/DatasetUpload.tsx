import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { Storage, GridOn } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import FileUploadCard from './FileUploadCard';
import DatasetUploadTable from './DatasetUploadTable';

const DatasetUpload: React.FC = () => {
  const {
    dataset,
    uploadGeneExpression,
    removeUploadedDataset,
    retryUploadQueueItem,
    updateDatasetName,
  } = useApp();

  const isUploadInProgress = dataset.datasetUploadQueue.some((item) => item.status === 'UPLOADING');

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 900,
        mx: 'auto',
        minHeight: '100vh',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Upload Your Dataset
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Upload your spatial transcriptomics data to begin domain segmentation analysis
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FileUploadCard
          title="Gene Expression Matrix"
          description="Upload your gene expression count matrix. Each row should represent a spot/cell and each column a gene."
          acceptedFormats={['.zip']}
          multiple
          required
          readOnly={false}
          uploadedFiles={dataset.datasetUploadQueue.map((item) => ({
            id: item.id,
            name: item.fileName,
            uploadProgress: item.uploadProgress,
            status: item.status,
            error: item.error,
          }))}
          onFileSelect={uploadGeneExpression}
        />
      </Box>

      <DatasetUploadTable
        items={dataset.datasetUploadQueue}
        onUpdateName={updateDatasetName}
        onRetry={retryUploadQueueItem}
        onDelete={removeUploadedDataset}
      />

      {isUploadInProgress && (
        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
          Uploads are processed sequentially to protect backend capacity.
        </Typography>
      )}
    </Box>
  );
};

export default DatasetUpload;
