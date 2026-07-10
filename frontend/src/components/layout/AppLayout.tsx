import React, { useRef } from 'react';
import { Box } from '@mui/material';
import { useApp } from '@/context/AppContext';
import { useRestoreWorkspace } from '@/stores/bootstrap';
import { usePipelineStore } from '@/stores/pipeline';
import TopNavBar from './TopNavBar';
import LeftPanel from '../navigation/LeftPanel';
import MainWorkspace from '../workspace/MainWorkspace';
import FloatingCompareBar from '../visualization/FloatingCompareBar';

const AppLayout: React.FC = () => {
  const { createExperiment } = useApp();
  const restoredOnce = useRef(false);

  useRestoreWorkspace((restoredMode) => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;

    if (restoredMode === 'focus') {
      const snapshot = usePipelineStore.getState().lastCreatedExperiment;
      if (snapshot) {
        createExperiment(
          snapshot.toolId,
          snapshot.parameters,
          snapshot.toolLabel,
          snapshot.numberOfRuns,
          snapshot.seedList,
          snapshot.datasetIds,
          snapshot.requirements,
        );
      }
    }
   
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