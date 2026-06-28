import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useDatasetStore } from '@/stores/dataset';
import ImportResultsTrack from './ImportResultsTrack';
import PipelineExecutionTrack from './PipelineExecutionTrack';

type ExperimentBuilderTabValue = 'select-tool' | 'import-result';

const ExperimentBuilder: React.FC = () => {
  const successfulDatasets = useDatasetStore((state) => state.uploadedDatasets);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ExperimentBuilderTabValue>('select-tool');
  const [showWorkflowTabs, setShowWorkflowTabs] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const annotationId = query.get('annotation_id');
    const datasetId = query.get('dataset_id');

    if (!annotationId || !datasetId) {
      return;
    }
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const availableDatasets = useMemo(
    () =>
      successfulDatasets
        .filter((dataset) => Boolean(dataset.datasetId))
        .map((dataset) => ({
          id: dataset.datasetId as string,
          name: dataset.datasetName,
        })),
    [successfulDatasets]
  );

  const handleTabChange = useCallback((_: React.SyntheticEvent, nextTab: ExperimentBuilderTabValue) => {
    setActiveTab(nextTab);
    setShowWorkflowTabs(true);
  }, []);

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 1880,
        mx: 'auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          {showWorkflowTabs && (
            <Box sx={{ mb: 3 }}>
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
                <Tab label="Run Analysis Pipeline" value="select-tool" />
                <Tab label="Import Pre-computed Results" value="import-result" />
              </Tabs>
            </Box>
          )}

          {activeTab === 'select-tool' && !showWorkflowTabs && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2 }}>
                Experiment Builder
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Configuring Pipeline Tools
              </Typography>
            </Box>
          )}

          {activeTab === 'select-tool' && (
            <PipelineExecutionTrack
              availableDatasets={availableDatasets}
              onStepVisibilityChange={setShowWorkflowTabs}
            />
          )}

          {activeTab === 'import-result' && <ImportResultsTrack availableDatasets={availableDatasets} />}
        </Paper>
      </Box>
    </Box>
  );
};

export default ExperimentBuilder;
