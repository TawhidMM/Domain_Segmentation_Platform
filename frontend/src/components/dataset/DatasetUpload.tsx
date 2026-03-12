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
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Upload Your Dataset
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Upload your spatial transcriptomics data to begin domain segmentation analysis
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
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

      {dataset.summary && (
        <>
          <Divider sx={{ my: 4 }} />
          <Paper
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
              border: '1px solid',
              borderColor: 'primary.light',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Dataset Summary
            </Typography>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GridOn sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {dataset.summary.spotCount.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Spots / Cells
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Storage sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                    {dataset.summary.geneCount.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Genes
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default DatasetUpload;
