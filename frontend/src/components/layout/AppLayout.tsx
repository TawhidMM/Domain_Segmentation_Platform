import React from 'react';
import { Box } from '@mui/material';
import TopNavBar from './TopNavBar';
import LeftPanel from '../navigation/LeftPanel';
import MainWorkspace from '../workspace/MainWorkspace';
import FloatingCompareBar from '../visualization/FloatingCompareBar';

const AppLayout: React.FC = () => {
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
