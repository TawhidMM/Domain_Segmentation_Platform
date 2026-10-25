import React, { useCallback, useEffect, useMemo } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDatasetStore } from '@/stores/dataset';
import { useUIStore } from '@/stores/ui/uiStore.ts';
import { DatasetUploadStatus, WorkspaceTab } from '@/types';
import ImportResultsTrack from './ImportResultsTrack';
import PipelineExecutionTrack from './PipelineExecutionTrack';

const ExperimentBuilder: React.FC = () => {

  const datasets = useDatasetStore((state) => state.datasets);
  const availableDatasets = useMemo(
    () =>
      datasets
        .filter((d) => d.status === DatasetUploadStatus.SUCCESS && Boolean(d.datasetId))
        .map((dataset) => ({
          id: dataset.datasetId as string,
          name: dataset.datasetName,
        })),
    [datasets]
  );
  
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useUIStore((state) => state.activeTab);
  const setWorkspaceTab = useUIStore((state) => state.setWorkspaceTab);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const annotationId = query.get('annotation_id');
    const datasetId = query.get('dataset_id');

    if (!annotationId || !datasetId) {
      return;
    }
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, nextTab: WorkspaceTab) => {
      setWorkspaceTab(nextTab);
    },
    [setWorkspaceTab]
  );

  return (
    <Box
      sx={{
        p: 2,
        width: '75%',
        maxWidth: 1880,
        mx: 'auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 4 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                },
              }}
            >
              <Tab label="Run Analysis Pipeline" value="pipeline" />
              <Tab label="Import Pre-computed Results" value="import" />
            </Tabs>
            {activeTab === WorkspaceTab.PIPELINE ? (
              <Typography
                component="a"
                href="/how-to-use#creating-analysis"
                target="_blank"
                rel="noopener"
                variant="caption"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                How to Create Analysis ?
              </Typography>
            ) : (
              <Typography
                component="a"
                href="/how-to-use#uploading-precomputed-results"
                target="_blank"
                rel="noopener"
                variant="caption"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                How to Import Pre-computed Results ?
              </Typography>
            )}
          </Box>

          {activeTab === WorkspaceTab.PIPELINE && <PipelineExecutionTrack availableDatasets={availableDatasets} />}

          {activeTab === WorkspaceTab.IMPORT && <ImportResultsTrack availableDatasets={availableDatasets} />}
        </Paper>
      </Box>
    </Box>
  );
};

export default ExperimentBuilder;
