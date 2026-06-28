import React from 'react';
import { Box, Typography } from '@mui/material';
import { useDatasetStore } from '@/stores/dataset';
import FileUploadCard from './FileUploadCard';
import DatasetUploadTable from './DatasetUploadTable';

const DatasetUpload: React.FC = () => {
  const uploadQueue = useDatasetStore((state) => state.uploadQueue);
  const uploadedDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const uploadDataset = useDatasetStore((state) => state.uploadDataset);
  const retryUpload = useDatasetStore((state) => state.retryUpload);
  const removeUploadedDataset = useDatasetStore((state) => state.removeUploadedDataset);
  const updateDatasetName = useDatasetStore((state) => state.updateDatasetName);

  const isUploadInProgress = uploadQueue.some((item) => item.status === 'UPLOADING');

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', minHeight: '100vh', overflowY: 'auto' }}>
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
          uploadedFiles={uploadQueue.map((item) => ({
            id: item.id,
            name: item.fileName,
            uploadProgress: item.uploadProgress,
            status: item.status,
            error: item.error,
          }))}
          onFileSelect={uploadDataset}
        />
      </Box>

      <DatasetUploadTable
        items={uploadedDatasets}
        onUpdateName={updateDatasetName}
        onRetry={retryUpload}
        onDelete={removeUploadedDataset}
      />
    </Box>
  );
};

export default DatasetUpload;