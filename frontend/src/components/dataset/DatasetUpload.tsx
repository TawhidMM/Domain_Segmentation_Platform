import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { Storage, GridOn, Image } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import FileUploadCard from './FileUploadCard';

const DatasetUpload: React.FC = () => {
  const { dataset, uploadGeneExpression, uploadSpatialCoordinates, uploadTissueImage } = useApp();

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
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
          acceptedFormats={['.csv', '.tsv', '.h5ad', '.h5']}
          required
          uploadedFile={dataset.geneExpressionFile}
          onFileSelect={uploadGeneExpression}
        />

        <FileUploadCard
          title="Spatial Coordinates"
          description="Upload spot/cell spatial coordinates with X and Y positions corresponding to the tissue image."
          acceptedFormats={['.csv', '.tsv', '.json']}
          required
          uploadedFile={dataset.spatialCoordinatesFile}
          onFileSelect={uploadSpatialCoordinates}
        />

        <FileUploadCard
          title="Tissue Image (H&E)"
          description="Optional histology image for integrated analysis and visualization overlay."
          acceptedFormats={['.png', '.jpg', '.jpeg', '.tif', '.tiff']}
          disabled
          uploadedFile={dataset.tissueImageFile}
          onFileSelect={uploadTissueImage}
        />
      </Box>

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
