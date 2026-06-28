import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useApp } from '@/context/AppContext';
import { useRestoreWorkspace } from '@/stores/bootstrap';
import { usePipelineStore } from '@/stores/pipeline';
import TopNavBar from './TopNavBar';
import LeftPanel from '../navigation/LeftPanel';
import MainWorkspace from '../workspace/MainWorkspace';
import FloatingCompareBar from '../visualization/FloatingCompareBar';

const AppLayout: React.FC = () => {
  const { setWorkspaceMode, createExperiment } = useApp();
  const restoredOnce = useRef(false);

  // Central workspace restoration — runs once on mount.
  // This is the ONLY place that decides where the user resumes.
  useRestoreWorkspace((restoredMode) => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;

    if (restoredMode === 'focus') {
      // Re-create the experiment from the persisted snapshot
      const snapshot = usePipelineStore.getState().lastCreatedExperiment;
      if (snapshot) {
        createExperiment(
          snapshot.toolId,
          snapshot.parameters,
          snapshot.toolLabel,
          snapshot.numberOfRuns,
          snapshot.datasetIds,
          snapshot.requirements,
        );
      }
      // setWorkspaceMode('focus') is called inside createExperiment
    } else if (restoredMode === 'builder') {
      setWorkspaceMode('builder');
    }
    // 'upload' mode is the default, nothing to do
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