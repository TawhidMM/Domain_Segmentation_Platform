import React, { useEffect, useState } from 'react';
import { Box, Typography, Link, Alert, Button, CircularProgress } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Download } from '@mui/icons-material';
import { useDatasetStore } from '@/stores/dataset';
import FileUploadCard from './FileUploadCard';
import DatasetUploadTable from './DatasetUploadTable';
import { DatasetTechnology } from '@/types/upload';
import { DatasetUploadStatus } from '@/types';

const DatasetUpload: React.FC = () => {
  const datasets = useDatasetStore((state) => state.datasets);
  const uploadDataset = useDatasetStore((state) => state.uploadDataset);
  const retryUpload = useDatasetStore((state) => state.retryUpload);
  const removeUploadedDataset = useDatasetStore((state) => state.removeUploadedDataset);
  const updateDatasetName = useDatasetStore((state) => state.updateDatasetName);
  const downloadSampleDatasets = useDatasetStore((state) => state.downloadSampleDatasets);
  const [isDownloadingSamples, setIsDownloadingSamples] = useState(false);

  const isUploadInProgress = datasets.some((item) => item.status === DatasetUploadStatus.UPLOADING);
  const isSampleDownloadInProgress = datasets.some((item) => item.status === DatasetUploadStatus.DOWNLOADING);

  useEffect(() => {
    if (isUploadInProgress) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [isUploadInProgress]);

  return (
    <Box sx={{ p: 4, width: 900, mx: 'auto', minHeight: '100vh', overflowY: 'auto' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Upload Your Dataset
        </Typography>
        <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 500 }}>
          Upload one or more spatial transcriptomics datasets. You can add as many as you like before proceeding.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FileUploadCard
          title="Spatial Transcriptomics Dataset"
          description="Upload your spatial transcriptomics dataset in correct format."
          acceptedFormats={['.zip']}
          multiple
          required
          readOnly={false}
          onFileSelect={uploadDataset}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={isDownloadingSamples || isSampleDownloadInProgress ? <CircularProgress size={16} /> : <Download />}
            disabled={isDownloadingSamples || isSampleDownloadInProgress}
            onClick={async () => {
              setIsDownloadingSamples(true);
              try {
                await downloadSampleDatasets(DatasetTechnology.VISIUM);
              } finally {
                setIsDownloadingSamples(false);
              }
            }}
          >
            {isDownloadingSamples || isSampleDownloadInProgress
              ? 'Downloading sample datasets...'
              : 'Download Sample Datasets'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
          <Link
            component={RouterLink}
            to="/how-to-use#preparing-datasets"
            target="_blank"
            underline="hover"
            sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
          >
            What format should my dataset be in?
          </Link>
          <Link
            component={RouterLink}
            to="/how-to-use#uploading-dataset"
            target="_blank"
            underline="hover"
            sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
          >
            How does uploading work?
          </Link>
        </Box>

        {(isUploadInProgress || isSampleDownloadInProgress) && (
          <Alert severity="warning" sx={{ '& .MuiAlert-message': { fontSize: '0.875rem' } }}>
            <strong>Don't close or refresh this tab.</strong> Your upload is in progress.
            Closing the browser tab will cancel the upload and you'll need to re-upload the file.
          </Alert>
        )}

        <DatasetUploadTable
          items={datasets}
          onUpdateName={updateDatasetName}
          onRetry={retryUpload}
          onDelete={removeUploadedDataset}
        />
      </Box>
    </Box>
  );
};

export default DatasetUpload;