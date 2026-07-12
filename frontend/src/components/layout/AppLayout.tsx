import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { useRestoreWorkspace } from '@/stores/bootstrap';
import { usePipelineStore } from '@/stores/pipeline';
import TopNavBar from './TopNavBar';
import LeftPanel from '../navigation/LeftPanel';
import MainWorkspace from '../workspace/MainWorkspace';
import FloatingCompareBar from '../visualization/FloatingCompareBar';

const AppLayout: React.FC = () => {
  const restoredOnce = useRef(false);

  /**
   * Workspace restoration: simply ensure the active experiment ID is set correctly.
   * Experiment data is persisted in the pipeline store, so no recreation is needed.
   */
  useRestoreWorkspace((restoredMode) => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;

    // Experiments are now persisted in pipeline store and restored via rehydration.
    // We only need to set the activeExperimentId to show the correct experiment in focus view.
    // The `lastCreatedExperiment` snapshot is kept for legacy but is no longer used for recreation.
  });

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopNavBar />
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanel />
        <MainWorkspace />
      </Box>
      <FloatingCompareBar />
    </Box>
  );
};

export default AppLayout;